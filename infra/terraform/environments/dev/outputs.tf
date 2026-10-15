output "cluster_name" {
  value       = module.food_ordering.cluster_name
  description = "Run aws eks update-kubeconfig with this cluster name."
}

output "ecr_repository_urls" {
  value       = module.food_ordering.ecr_repository_urls
  description = "Push the built frontend and backend images to these ECR repositories."
}

output "vpc_id" {
  value       = module.food_ordering.vpc_id
  description = "New VPC created for this project."
}

output "private_subnet_ids" {
  value       = module.food_ordering.private_subnet_ids
  description = "Private subnets used for EKS managed workers."
}
