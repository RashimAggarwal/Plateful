variable "aws_region" {
  description = "AWS region for this environment."
  type        = string
}

variable "project_name" {
  description = "Short project name used for resource names and tags."
  type        = string
  default     = "plateful"
}

variable "environment" {
  description = "Environment label."
  type        = string
  default     = "dev"
}

variable "kubernetes_version" {
  description = "EKS Kubernetes minor version supported in the selected AWS region."
  type        = string
}

variable "cluster_admin_role_arn" {
  description = "IAM role ARN for the human administrator who will use kubectl."
  type        = string
}

variable "cluster_endpoint_public_access_cidrs" {
  description = "Your current public IPv4 CIDR(s), normally one address ending /32."
  type        = list(string)
}

variable "enable_nat_gateway" {
  description = "Explicit opt-in to a billable NAT Gateway for private node egress."
  type        = bool
  default     = false
}

variable "node_instance_types" {
  description = "Managed worker EC2 instance types."
  type        = list(string)
  default     = ["t3.medium"]
}

variable "node_min_size" {
  description = "Minimum number of workers."
  type        = number
  default     = 1
}

variable "node_desired_size" {
  description = "Initial desired number of workers."
  type        = number
  default     = 2
}

variable "node_max_size" {
  description = "Maximum number of workers."
  type        = number
  default     = 3
}
