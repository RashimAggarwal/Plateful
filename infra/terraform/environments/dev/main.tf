module "food_ordering" {
  source = "../../modules/food-ordering-eks"

  project_name                         = var.project_name
  environment                          = var.environment
  kubernetes_version                   = var.kubernetes_version
  cluster_admin_role_arn               = var.cluster_admin_role_arn
  cluster_endpoint_public_access_cidrs = var.cluster_endpoint_public_access_cidrs
  enable_nat_gateway                   = var.enable_nat_gateway
  node_instance_types                  = var.node_instance_types
  node_min_size                        = var.node_min_size
  node_desired_size                    = var.node_desired_size
  node_max_size                        = var.node_max_size
}
