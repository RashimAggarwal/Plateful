output "cluster_name" {
  description = "EKS cluster name."
  value       = aws_eks_cluster.this.name
}

output "cluster_endpoint" {
  description = "EKS Kubernetes API endpoint."
  value       = aws_eks_cluster.this.endpoint
}

output "cluster_admin_role_arn" {
  description = "IAM role granted cluster-admin access."
  value       = var.cluster_admin_role_arn
}

output "ecr_repository_urls" {
  description = "ECR repository URLs for frontend and backend."
  value       = { for name, repo in aws_ecr_repository.app : name => repo.repository_url }
}

output "vpc_id" {
  description = "ID of the new application VPC."
  value       = aws_vpc.this.id
}

output "private_subnet_ids" {
  description = "IDs of the private worker subnets."
  value       = aws_subnet.private[*].id
}

output "worker_role_arn" {
  description = "IAM role used by managed worker nodes."
  value       = aws_iam_role.nodes.arn
}
