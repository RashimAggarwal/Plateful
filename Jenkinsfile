def withAwsCredentialsIfConfigured(Closure body) {
  String id = (env.AWS_CREDENTIALS_ID ?: '').trim()
  if (id) {
    withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: id]]) {
      body.call()
    }
  } else {
    // The AWS CLI uses the agent's IAM role/profile/credential process.
    body.call()
  }
}

pipeline {
  agent { label "${params.JENKINS_AGENT_LABEL}" }

  options {
    timestamps()
    disableConcurrentBuilds()
    skipDefaultCheckout(true)
  }

  parameters {
    string(name: 'JENKINS_AGENT_LABEL', defaultValue: 'built-in', description: 'Use built-in for local Jenkins today; set the Linux AWS agent label when deploying to AWS.')
    booleanParam(name: 'BUILD_DOCKER_IMAGES', defaultValue: false, description: 'Build Docker images. Requires Docker Desktop/daemon to be running.')
    booleanParam(name: 'DEPLOY_TO_AWS', defaultValue: false, description: 'Opt in to ECR push and approved EKS deployment. Leave off for local-only CI.')
    string(name: 'AWS_REGION', defaultValue: 'us-east-1', description: 'AWS region containing ECR and EKS.')
    string(name: 'EKS_CLUSTER_NAME', defaultValue: 'plateful-dev', description: 'EKS cluster name from Terraform output.')
    string(name: 'ECR_FRONTEND_REPOSITORY_URL', defaultValue: '', description: 'Full frontend ECR repository URL from Terraform output.')
    string(name: 'ECR_BACKEND_REPOSITORY_URL', defaultValue: '', description: 'Full backend ECR repository URL from Terraform output.')
    string(name: 'AWS_CREDENTIALS_ID', defaultValue: '', description: 'Optional Jenkins AWS Credentials ID. Leave blank to use the agent role/profile.')
    string(name: 'EKS_DEPLOY_ROLE_ARN', defaultValue: '', description: 'Optional role to assume for kubectl; grant it namespace-scoped EKS access.')
    string(name: 'K8S_NAMESPACE', defaultValue: 'food-ordering', description: 'Namespace containing the application Deployments.')
    string(name: 'FRONTEND_DEPLOYMENT', defaultValue: 'plateful-frontend', description: 'Existing frontend Deployment name.')
    string(name: 'FRONTEND_CONTAINER', defaultValue: 'frontend', description: 'Container name in the frontend Deployment.')
    string(name: 'BACKEND_DEPLOYMENT', defaultValue: 'plateful-backend', description: 'Existing backend Deployment name.')
    string(name: 'BACKEND_CONTAINER', defaultValue: 'backend', description: 'Container name in the backend Deployment.')
    string(name: 'ROLLOUT_TIMEOUT', defaultValue: '5m', description: 'Maximum wait for each Kubernetes rollout.')
  }

  environment {
    IMAGE_TAG = ''
    BACKEND_IMAGE = ''
    FRONTEND_IMAGE = ''
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        script {
          String commit = isUnix()
            ? sh(returnStdout: true, script: 'git rev-parse --short=12 HEAD').trim()
            : bat(returnStdout: true, script: '@git rev-parse --short=12 HEAD').trim()
          env.IMAGE_TAG = "${env.BUILD_NUMBER}-${commit}"
          env.BACKEND_IMAGE = "plateful/backend:${env.IMAGE_TAG}"
          env.FRONTEND_IMAGE = "plateful/frontend:${env.IMAGE_TAG}"
          echo "Building immutable image tag ${env.IMAGE_TAG}"
        }
      }
    }

    stage('Install dependencies') {
      steps {
        dir('backend') {
          script { if (isUnix()) { sh 'npm ci' } else { bat 'npm ci' } }
        }
        dir('frontend') {
          script { if (isUnix()) { sh 'npm ci' } else { bat 'npm ci' } }
        }
      }
    }

    stage('Test') {
      steps {
        dir('backend') {
          script { if (isUnix()) { sh 'npm test' } else { bat 'npm test' } }
        }
        dir('frontend') {
          script {
            if (isUnix()) { sh 'npm run test --if-present' }
            else { bat 'npm run test --if-present' }
          }
        }
      }
    }

    stage('Build frontend') {
      steps {
        dir('frontend') {
          script { if (isUnix()) { sh 'npm run build' } else { bat 'npm run build' } }
        }
      }
    }

    stage('Build container images') {
      when { expression { params.BUILD_DOCKER_IMAGES || params.DEPLOY_TO_AWS } }
      steps {
        script {
          if (isUnix()) {
            sh '''
              set -eu
              docker build --pull -f backend/Dockerfile -t "$BACKEND_IMAGE" backend
              docker build --pull -f frontend/Dockerfile -t "$FRONTEND_IMAGE" .
            '''
          } else {
            bat '''
              docker build --pull -f backend/Dockerfile -t "%BACKEND_IMAGE%" backend
              if errorlevel 1 exit /b %errorlevel%
              docker build --pull -f frontend/Dockerfile -t "%FRONTEND_IMAGE%" .
            '''
          }
        }
      }
    }

    stage('Validate AWS release settings') {
      when { expression { params.DEPLOY_TO_AWS } }
      steps {
        script {
          if (env.BRANCH_NAME != 'main') {
            error('AWS publishing and deployment are allowed only from the main branch.')
          }
          if (!params.BUILD_DOCKER_IMAGES) {
            error('Set BUILD_DOCKER_IMAGES=true before enabling AWS deployment.')
          }
          if (!params.ECR_FRONTEND_REPOSITORY_URL?.trim() || !params.ECR_BACKEND_REPOSITORY_URL?.trim()) {
            error('Set both ECR repository URLs from Terraform outputs before enabling AWS deployment.')
          }
        }
      }
    }

    stage('Push images to ECR') {
      when { expression { env.BRANCH_NAME == 'main' && params.DEPLOY_TO_AWS } }
      steps {
        script {
          withAwsCredentialsIfConfigured {
            sh '''
              set -eu
              set +x
              test -n "$ECR_FRONTEND_REPOSITORY_URL" || { echo "Set ECR_FRONTEND_REPOSITORY_URL from Terraform output."; exit 2; }
              test -n "$ECR_BACKEND_REPOSITORY_URL" || { echo "Set ECR_BACKEND_REPOSITORY_URL from Terraform output."; exit 2; }
              FRONTEND_REGISTRY="${ECR_FRONTEND_REPOSITORY_URL%%/*}"
              BACKEND_REGISTRY="${ECR_BACKEND_REPOSITORY_URL%%/*}"
              if [ "$FRONTEND_REGISTRY" != "$BACKEND_REGISTRY" ]; then
                echo "Frontend and backend ECR repositories must use the same registry."
                exit 2
              fi
              aws sts get-caller-identity --output text >/dev/null
              ECR_PASSWORD="$(aws ecr get-login-password --region "$AWS_REGION")"
              printf '%s' "$ECR_PASSWORD" | docker login --username AWS --password-stdin "$FRONTEND_REGISTRY"
              unset ECR_PASSWORD
              BACKEND_ECR_IMAGE="$ECR_BACKEND_REPOSITORY_URL:$IMAGE_TAG"
              FRONTEND_ECR_IMAGE="$ECR_FRONTEND_REPOSITORY_URL:$IMAGE_TAG"
              docker tag "$BACKEND_IMAGE" "$BACKEND_ECR_IMAGE"
              docker tag "$FRONTEND_IMAGE" "$FRONTEND_ECR_IMAGE"
              docker push "$BACKEND_ECR_IMAGE"
              docker push "$FRONTEND_ECR_IMAGE"
              docker logout "$FRONTEND_REGISTRY" >/dev/null 2>&1 || true
            '''
          }
        }
      }
    }

    stage('Approve EKS deployment') {
      when { expression { env.BRANCH_NAME == 'main' && params.DEPLOY_TO_AWS } }
      steps {
        input message: "Deploy ${env.IMAGE_TAG} to ${params.EKS_CLUSTER_NAME}/${params.K8S_NAMESPACE}?", ok: 'Deploy'
      }
    }

    stage('Deploy to EKS') {
      when { expression { env.BRANCH_NAME == 'main' && params.DEPLOY_TO_AWS } }
      steps {
        script {
          withAwsCredentialsIfConfigured {
            sh '''
              set -eu
              set +x
              KUBECONFIG_FILE="$(mktemp)"
              trap 'rm -f "$KUBECONFIG_FILE"' EXIT
              export KUBECONFIG="$KUBECONFIG_FILE"

              if [ -n "$EKS_DEPLOY_ROLE_ARN" ]; then
                aws eks update-kubeconfig --region "$AWS_REGION" --name "$EKS_CLUSTER_NAME" --role-arn "$EKS_DEPLOY_ROLE_ARN" >/dev/null
              else
                aws eks update-kubeconfig --region "$AWS_REGION" --name "$EKS_CLUSTER_NAME" >/dev/null
              fi

              kubectl get namespace "$K8S_NAMESPACE" >/dev/null
              kubectl get deployment "$BACKEND_DEPLOYMENT" --namespace "$K8S_NAMESPACE" >/dev/null
              kubectl get deployment "$FRONTEND_DEPLOYMENT" --namespace "$K8S_NAMESPACE" >/dev/null
              kubectl auth can-i patch deployments.apps --namespace "$K8S_NAMESPACE" | grep -qx yes
              kubectl auth can-i watch deployments.apps --namespace "$K8S_NAMESPACE" | grep -qx yes
              BACKEND_ECR_IMAGE="$ECR_BACKEND_REPOSITORY_URL:$IMAGE_TAG"
              FRONTEND_ECR_IMAGE="$ECR_FRONTEND_REPOSITORY_URL:$IMAGE_TAG"
              kubectl set image "deployment/$BACKEND_DEPLOYMENT" "$BACKEND_CONTAINER=$BACKEND_ECR_IMAGE" --namespace "$K8S_NAMESPACE"
              kubectl rollout status "deployment/$BACKEND_DEPLOYMENT" --namespace "$K8S_NAMESPACE" --timeout="$ROLLOUT_TIMEOUT"
              kubectl set image "deployment/$FRONTEND_DEPLOYMENT" "$FRONTEND_CONTAINER=$FRONTEND_ECR_IMAGE" --namespace "$K8S_NAMESPACE"
              kubectl rollout status "deployment/$FRONTEND_DEPLOYMENT" --namespace "$K8S_NAMESPACE" --timeout="$ROLLOUT_TIMEOUT"
            '''
          }
        }
      }
    }
  }

  post {
    success { echo 'Pipeline completed successfully.' }
    failure { echo 'Pipeline failed. Review the failed stage; Kubernetes rollout failures stop the pipeline.' }
  }
}
