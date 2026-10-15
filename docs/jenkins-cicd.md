# Jenkins CI/CD for Plateful

The root `Jenkinsfile` checks out this repository, installs from the committed npm lockfiles, runs backend tests and any frontend test script that exists, and builds the frontend. Docker image builds, ECR publishing, and EKS deployment are controlled by parameters. Their defaults are off so a local CI run needs no AWS. The image tag is the Jenkins build number plus the checked-out commit ID. When AWS deployment is enabled on `main`, the pipeline asks for approval before changing EKS Deployments.

## What the repository already provides

- The root npm scripts call the frontend and backend. The pipeline runs `npm ci` in `backend/` and `frontend/`, which have their own lockfiles.
- The backend defines `npm test` and has `backend/tests/workflow.test.js`.
- The frontend currently has no `test` script. Jenkins checks for one and skips only that test command when it is absent; it still runs `npm run build`.
- `backend/Dockerfile` uses `backend/` as build context. `frontend/Dockerfile` uses the repository root as build context.
- Terraform creates ECR repositories named `plateful-dev/backend` and `plateful-dev/frontend`; their complete URLs are Terraform output values.
- Terraform creates EKS infrastructure, but this repository has no Kubernetes Deployment manifests. Before the first pipeline run, create the namespace and the Deployments and Services. Defaults expected by the pipeline are namespace `food-ordering`, Deployment names `plateful-backend` and `plateful-frontend`, and matching container names `backend` and `frontend`. Change the Jenkins parameters if your names differ.

## Jenkins controller and agent

The existing Jenkins WAR reports version 2.580.1, and `http://localhost:8080/login` responds. There is no registered Jenkins Windows service. Docker CLI, AWS CLI, and kubectl commands are present, but Docker's engine is not running. Jenkins is not configured with this project yet.

The Jenkinsfile supports local **Windows or Linux** CI agents. Its default agent label is `built-in`, suitable for Jenkins' built-in node when running locally. Windows CI uses `bat`; Linux CI uses `sh`. To publish/deploy to AWS tomorrow, set `JENKINS_AGENT_LABEL=linux-docker-aws-eks` and use a Linux agent because the AWS and kubectl steps use POSIX shell commands. The agent must have:

- Git, Node.js 22/npm, Docker CLI and a running Docker daemon with permission for the Jenkins agent user.
- AWS CLI v2 and kubectl on `PATH`.
- Network access to GitHub, npm, ECR, the EKS API endpoint, and the base image registries used by Docker builds.
- Access to the EKS public API from an allowed CIDR, or a private network path to the cluster. Terraform restricts the public API endpoint to configured CIDRs.

`BUILD_DOCKER_IMAGES` defaults to `false` because Docker Desktop is currently not running on this host. Turn it on only after Docker reports a running engine. `DEPLOY_TO_AWS` also defaults to `false`; leave it off for today's local run.

## Plugins

- **Pipeline** (including Declarative Pipeline and the `input` step).
- **Git** for repository checkout.
- **GitHub Branch Source** for GitHub Multibranch Pipeline discovery.
- **Credentials Binding** and **AWS Credentials** only if you choose the optional Jenkins AWS credential ID. The preferred setup is an IAM role or temporary credential provider on the agent; leave `AWS_CREDENTIALS_ID` empty in that case.

Install plugins using Jenkins' Update Center and choose versions compatible with your Jenkins core.

## AWS and Kubernetes identity

Preferred: attach a narrowly scoped IAM role to the Linux agent or configure another temporary AWS credential provider. For ECR, allow `ecr:GetAuthorizationToken` and the required image upload actions (`ecr:BatchCheckLayerAvailability`, `ecr:InitiateLayerUpload`, `ecr:UploadLayerPart`, `ecr:CompleteLayerUpload`, and `ecr:PutImage`), scoped to the two project repositories where supported. For EKS, allow `eks:DescribeCluster`. The identity used by `kubectl` must also be authorized by an EKS access entry and Kubernetes RBAC to get, patch, and watch Deployments only in the application namespace.

The current Terraform example grants cluster-admin to its separately configured `cluster_admin_role_arn`; it does not automatically add a Jenkins role. Have an administrator create/authorize a separate role with namespace-scoped permissions, or use an approved existing deployment identity. If `EKS_DEPLOY_ROLE_ARN` is set, the agent identity must be allowed to assume it, and the target role must be authorized in EKS. If using saved credentials instead, add an AWS credential to Jenkins and enter only its **credential ID** in the build parameter. Never put AWS key values in the Jenkinsfile or job parameters.

## Application settings and secrets

The existing Kubernetes backend Deployment must receive `MONGODB_URI` and `JWT_SECRET` from a Kubernetes Secret or managed secret integration. Also set `CLIENT_ORIGIN` for the real frontend URL. Never put these values in the Jenkinsfile, build parameters, source control, Docker build arguments, or frontend environment.

Because the Terraform module puts workers in private subnets behind a NAT Gateway, Atlas Network Access must allow the NAT Gateway's Elastic IP for backend-to-Atlas traffic. Find that address in the AWS console or Terraform state/output and add it to Atlas as a narrow `/32` entry; do not allow `0.0.0.0/0` for production.

The frontend container reads its runtime `API_URL` setting when it starts. Set it in the frontend Deployment to the publicly reachable backend API URL, including `/api`. The Deployment, Service, Ingress, DNS, and TLS setup must already route traffic to the frontend and backend; this Jenkinsfile only replaces image versions on existing Deployments.

## Configure the Multibranch Pipeline

1. Push the repository, including `Jenkinsfile`, to GitHub. This project folder currently has no `.git` metadata, so Jenkins cannot check it out until it is pushed to or connected with a Git repository.
2. In Jenkins, create **New Item → Multibranch Pipeline**, add the GitHub repository source and checkout credentials if the repository is private, and configure the Linux agent label.
3. Configure the agent IAM role/temporary credentials, or add the optional AWS credential described above.
4. Provide these safe, non-secret build parameters (they can be job defaults):

   | Parameter | Value |
   |---|---|
   | `AWS_REGION` | AWS region used by Terraform. |
   | `EKS_CLUSTER_NAME` | Terraform output `cluster_name`. |
   | `ECR_FRONTEND_REPOSITORY_URL` | Frontend URL from Terraform output `ecr_repository_urls`. |
   | `ECR_BACKEND_REPOSITORY_URL` | Backend URL from Terraform output `ecr_repository_urls`. |
   | `AWS_CREDENTIALS_ID` | Optional Jenkins AWS credential ID; leave empty to use the agent's role/profile. |
   | `EKS_DEPLOY_ROLE_ARN` | Optional IAM role ARN for the namespace-scoped deploy identity. |
   | `K8S_NAMESPACE` | Existing app namespace; default `food-ordering`. |
   | `FRONTEND_DEPLOYMENT`, `FRONTEND_CONTAINER` | Existing frontend Deployment and container names. |
   | `BACKEND_DEPLOYMENT`, `BACKEND_CONTAINER` | Existing backend Deployment and container names. |
   | `ROLLOUT_TIMEOUT` | Maximum wait per rollout, such as `5m`. |

   These are configuration values, not secrets. Do not pass MongoDB URIs, JWT values, or AWS key values here.

5. For local-only CI, leave `BUILD_DOCKER_IMAGES=false` and `DEPLOY_TO_AWS=false`; the pipeline runs checkout, installs, tests, and frontend build without contacting AWS. For tomorrow's AWS run, select a Linux agent label, set `BUILD_DOCKER_IMAGES=true` and `DEPLOY_TO_AWS=true`, and fill in ECR/cluster parameters. Only `main` publishes; the EKS stage pauses for explicit approval. Confirm the cluster and namespace shown in the prompt before approving.

The pipeline disables shell tracing around authentication and deployment, sends the ECR login password directly to Docker over stdin, and never reads or prints MongoDB/JWT secrets. Jenkins masking is defense in depth; do not echo secrets from any future steps.

## Success and failure behavior

Successful stages include checkout, dependency installation, tests, frontend build, Docker builds, ECR push (on `main`), and `kubectl rollout status` for both Deployments (on `main` after approval). A failed test, ECR login/push, missing Deployment, permission check, or rollout makes the build fail. The pipeline does not run database migrations or seed data.
