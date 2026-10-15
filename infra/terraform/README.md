# AWS Terraform for Plateful

This configuration defines a new, isolated VPC, Amazon EKS cluster and managed EC2 worker group, and two Amazon ECR repositories for the existing React frontend and Express backend. The application database remains MongoDB Atlas. No RDS, PostgreSQL, database credentials, Atlas URI, JWT secret, Kubernetes Secret, load balancer, or AWS credentials are managed by Terraform here.

## Layout

- `modules/food-ordering-eks`: reusable networking, IAM, EKS, worker, logging, and ECR resources.
- `environments/dev`: AWS provider and development-specific inputs. Copy `terraform.tfvars.example` to `terraform.tfvars` and replace its example values.

Terraform state is local for this student demonstration. Keep it private and never commit state, plan files, credentials, or `terraform.tfvars`. For a team or production deployment, configure a secured remote state backend separately.

## Architecture

- A new IPv4 VPC with two public and two private subnets across two available Availability Zones. Public subnets are tagged for internet-facing Kubernetes load balancers; private subnets for internal load balancers.
- An Internet Gateway and public routes. A single NAT Gateway is an explicit cost opt-in (`enable_nat_gateway = true`) that gives private worker nodes outbound access for AWS image pulls and updates. It is a single-AZ path and not a high-availability production design; production should use one NAT Gateway per AZ or a deliberately engineered endpoint-based egress design.
- An EKS cluster with a private Kubernetes API endpoint and a public endpoint restricted to supplied IPv4 CIDRs. Private worker nodes use a managed node group. The cluster creator is not automatically granted admin; only the specified IAM role receives the EKS cluster-admin access policy.
- Separate cluster and worker IAM roles. The worker role receives the standard worker, CNI, and ECR pull policies; it receives no EKS cluster-admin permissions. The cluster control-plane API, audit, and authenticator logs go to a 30-day CloudWatch log group.
- Immutable, AES-256-encrypted ECR repositories for `frontend` and `backend`, image scanning on push, and cleanup of untagged images older than 14 days. Use unique image tags such as a Git commit ID, not `latest`.

The app containers are not deployed by this Terraform. After the infrastructure is reviewed and created, a separate Kubernetes deployment should push the Docker images to ECR, create Deployments/Services and an Ingress/load balancer, set the frontend runtime API URL, and inject `MONGODB_URI` and `JWT_SECRET` into the backend from Kubernetes Secrets or a managed secrets integration. Keep those values out of Terraform, image layers, frontend settings, and source control. Set the backend's browser origin to the actual frontend URL. An ALB controller and public load balancer are intentionally not included because no Kubernetes deployment or ingress configuration exists yet.

## Prerequisites

- Terraform CLI 1.6 or newer, AWS CLI v2, and `kubectl`.
- An AWS account and a named AWS CLI profile or IAM Identity Center session with permissions to create the resources in the plan. Do not put access keys in Terraform files. Prefer temporary role credentials; confirm the account and identity first:

  ```powershell
  aws sts get-caller-identity
  aws configure list
  ```

- An IAM role ARN for the person who will administer this cluster. That role needs to exist before apply and needs permissions to create the infrastructure. The example ARN is a placeholder.
- Pick a supported EKS version for the chosen region. The example uses `1.37` based on the AWS EKS release calendar available when this file was prepared; verify with AWS before planning.
- Copy the example variable file and edit it:

  ```powershell
  Set-Location infra/terraform/environments/dev
  Copy-Item terraform.tfvars.example terraform.tfvars
  notepad terraform.tfvars
  ```

  Replace the account/role placeholder. Set the cluster API CIDR to your current public IP `/32`. To get the address in PowerShell:

  ```powershell
  (Invoke-RestMethod https://checkip.amazonaws.com).Trim() + "/32"
  ```

  The example uses the non-routable documentation IP `203.0.113.10/32`; replace it. Do not use `0.0.0.0/0`. Set `enable_nat_gateway = true` only if you accept its recurring cost.

## Review and apply manually

From `infra/terraform/environments/dev`:

```powershell
terraform init
terraform fmt -recursive ..\..
terraform validate
terraform plan -var-file=terraform.tfvars -out=tfplan
terraform show tfplan
```

Read the full plan and verify the AWS account, region, names, CIDRs, administrator role, NAT Gateway, worker count, and all resources before applying. `terraform plan` does not create resources. If and only if you decide to proceed:

```powershell
terraform apply tfplan
```

Then retrieve the connection settings and verify access:

```powershell
aws eks update-kubeconfig --region us-east-1 --name (terraform output -raw cluster_name)
kubectl get nodes
terraform output ecr_repository_urls
```

Change `us-east-1` to the `aws_region` value you selected in `terraform.tfvars`.

Use the ECR URLs with the AWS CLI login/push workflow from the Docker project instructions. A Kubernetes Deployment and Service/Ingress still need to be created for the web app.

## Cost and cleanup

This is not a free-tier design. EKS control-plane hourly charges continue while the cluster exists. A NAT Gateway has hourly and per-GB processing charges, plus public IPv4 charges. The two `t3.medium` workers, their EBS disks, CloudWatch log ingestion/storage, ECR storage, data transfer, and any later load balancer also incur charges. One NAT is cheaper than a per-AZ pair but adds a single-AZ dependency and potential cross-AZ data charges. Check the current prices for your chosen region with the AWS Pricing Calculator before applying. No AWS resources have been created by preparing these files.

When finished, first inspect the exact planned deletion:

```powershell
terraform plan -destroy -var-file=terraform.tfvars -out=destroy.tfplan
terraform show destroy.tfplan
```

If the plan contains only this project's Terraform-managed resources and you intentionally want to remove them:

```powershell
terraform destroy -var-file=terraform.tfvars
```

Review the destroy prompt and verify resource names. Do not remove a shared or pre-existing resource. `force_delete = false` on ECR intentionally prevents deleting repositories that still contain images; delete those images deliberately, then review a fresh destroy plan. Retain the state until cleanup is complete.

## Security and state notes

- No Terraform variable or resource stores MongoDB Atlas credentials or JWT secrets. Provide those only to the backend at deployment time through Kubernetes Secrets or a managed secret integration.
- EKS public API access is restricted to the supplied CIDRs; if your public IP changes, update the variable and apply a reviewed plan. Worker subnets are private.
- Local Terraform state and saved plan files can contain infrastructure details. Keep them private and outside Git. Never share them publicly.
- ECR repositories are immutable: deploy each new build under a new tag.

## Useful references

- [EKS network requirements](https://docs.aws.amazon.com/eks/latest/userguide/network-reqs.html)
- [EKS cluster endpoint access](https://docs.aws.amazon.com/eks/latest/userguide/config-cluster-endpoint.html)
- [EKS Kubernetes version support](https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html)
- [Amazon EKS pricing](https://aws.amazon.com/eks/pricing/)
- [Amazon VPC pricing](https://aws.amazon.com/vpc/pricing/)
- [Terraform AWS provider EKS access entry](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_access_entry)
