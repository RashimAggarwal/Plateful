variable "project_name" {
  description = "Short application name used in AWS resource names."
  type        = string
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,18}$", var.project_name))
    error_message = "Use 2-19 lowercase letters, digits, or hyphens, starting with a letter."
  }
}

variable "environment" {
  description = "Environment label, such as dev or staging."
  type        = string
}

variable "kubernetes_version" {
  description = "EKS Kubernetes minor version supported in the selected region."
  type        = string
}

variable "cluster_admin_role_arn" {
  description = "IAM role ARN granted EKS cluster-admin access. Use a role you control, not a long-lived user key."
  type        = string
  validation {
    condition     = can(regex("^arn:[^:]+:iam::[0-9]{12}:role/.+$", var.cluster_admin_role_arn))
    error_message = "cluster_admin_role_arn must be an IAM role ARN."
  }
}

variable "cluster_endpoint_public_access_cidrs" {
  description = "IPv4 CIDRs allowed to reach the Kubernetes API public endpoint; use your current public IP /32."
  type        = list(string)
  validation {
    condition = length(var.cluster_endpoint_public_access_cidrs) > 0 && alltrue([
      for cidr in var.cluster_endpoint_public_access_cidrs : can(cidrnetmask(cidr)) && cidr != "0.0.0.0/0"
    ])
    error_message = "Provide one or more valid IPv4 CIDRs and never allow 0.0.0.0/0."
  }
}

variable "vpc_cidr" {
  description = "IPv4 CIDR allocated to this new VPC. Choose a range that does not overlap connected networks."
  type        = string
  default     = "10.40.0.0/16"
  validation {
    condition     = can(cidrnetmask(var.vpc_cidr)) && tonumber(split("/", var.vpc_cidr)[1]) >= 16 && tonumber(split("/", var.vpc_cidr)[1]) <= 20
    error_message = "vpc_cidr must be an IPv4 CIDR between /16 and /20 so the module can carve suitable subnets."
  }
}

variable "enable_nat_gateway" {
  description = "Explicit cost opt-in. Required for private EKS nodes to reach AWS image registries and public services."
  type        = bool
  default     = false
}

variable "node_instance_types" {
  description = "EC2 instance types for the managed EKS node group."
  type        = list(string)
  default     = ["t3.medium"]
}

variable "node_min_size" {
  description = "Minimum managed worker count."
  type        = number
  default     = 1
}

variable "node_desired_size" {
  description = "Desired managed worker count."
  type        = number
  default     = 2
}

variable "node_max_size" {
  description = "Maximum managed worker count."
  type        = number
  default     = 3
}

variable "log_retention_days" {
  description = "CloudWatch control-plane log retention."
  type        = number
  default     = 30
}

variable "tags" {
  description = "Additional tags applied to module resources."
  type        = map(string)
  default     = {}
}
