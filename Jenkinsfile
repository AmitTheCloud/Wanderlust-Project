pipeline {
  agent any

  environment {
    DOCKERHUB_REPO = "asolanki1811/wanderlust"
    IMAGE_TAG = "${env.BUILD_NUMBER}"
    APP_SERVER = "ubuntu@100.31.203.208"
    K8S_MANIFEST_DIR = "k8s"
  }

  stages {

    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build Docker image & Push') {
      steps {
        script {
          docker.withRegistry('https://index.docker.io/v1/', 'dockerhub') {
            def appImage = docker.build("${DOCKERHUB_REPO}:${IMAGE_TAG}")
            appImage.push()    // push based on BUILD_NUMBER tag
            appImage.push("latest")  // always keep a latest tag also
            sh "docker rmi ${DOCKERHUB_REPO}:${IMAGE_TAG} || true"
            sh "docker rmi ${DOCKERHUB_REPO}:latest || true"
          }
        }
      }
    }

    stage('Prepare k8s manifests') {
      steps {
        script {
          sh """
            mkdir -p deployed_manifests

            # Replace placeholder image with dynamic BUILD_NUMBER tag
            sed 's|IMAGE_PLACEHOLDER|${DOCKERHUB_REPO}:${IMAGE_TAG}|g' \
              ${K8S_MANIFEST_DIR}/app-deployment.yaml > deployed_manifests/app-deployment.yaml

            cp ${K8S_MANIFEST_DIR}/mongo-deployment.yaml deployed_manifests/ || true
            cp ${K8S_MANIFEST_DIR}/ingress.yaml deployed_manifests/ || true

            tar -czf manifests.tar.gz -C deployed_manifests .
          """
        }
      }
    }

    stage('Deploy to Kubernetes via SSH') {
      steps {
        sshagent (credentials: ['app-server-ssh']) {
          sh """
            scp -o StrictHostKeyChecking=no manifests.tar.gz ${APP_SERVER}:~/
            ssh -o StrictHostKeyChecking=no ${APP_SERVER} '
              mkdir -p deployed_manifests &&
              tar -xzf manifests.tar.gz -C deployed_manifests &&
              kubectl apply -f deployed_manifests/
            '
          """
        }
      }
    }
  }

  post {
    success {
      echo "Successfully deployed ${DOCKERHUB_REPO}:${IMAGE_TAG}"
    }
    failure {
      echo "Build or Deploy failed."
    }
  }
}
