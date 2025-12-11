pipeline {
  agent any

  environment {
    DOCKERHUB_REPO = "asolanki1811/wanderlust" // change this
    IMAGE_TAG = "${env.BUILD_NUMBER}"
    APP_SERVER = "ubuntu@100.31.203.208"        // change to your app EC2 public IP
    K8S_MANIFEST_DIR = "k8s"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build Docker image') {
      steps {
        script {
          docker.withRegistry('https://index.docker.io/v1/', 'dockerhub') {
            def appImage = docker.build("${env.DOCKERHUB_REPO}:${env.IMAGE_TAG}")
            appImage.push()
            sh "docker rmi ${env.DOCKERHUB_REPO}:${env.IMAGE_TAG} || true"
          }
        }
      }
    }

    stage('Update k8s manifests image and deploy') {
      steps {
        // Replace image placeholder with actual tag and copy to remote
        sh """
          mkdir -p deployed_manifests
          sed 's|DOCKERHUB_USER/wanderlust:latest|${DOCKERHUB_REPO}:${IMAGE_TAG}|g' ${K8S_MANIFEST_DIR}/app-deployment.yaml > deployed_manifests/app-deployment.yaml
          cp ${K8S_MANIFEST_DIR}/mongo-deployment.yaml deployed_manifests/
          cp ${K8S_MANIFEST_DIR}/ingress.yaml deployed_manifests/ || true
          tar -czf manifests.tar.gz -C deployed_manifests .
        """

        // SSH into app server and apply manifests (Jenkins credential 'app-server-ssh')
        sshagent (credentials: ['app-server-ssh']) {
          sh """
            scp -o StrictHostKeyChecking=no manifests.tar.gz ${APP_SERVER}:~/
            ssh -o StrictHostKeyChecking=no ${APP_SERVER} 'tar -xzf manifests.tar.gz -C ~/ && kubectl apply -f ~/deployed_manifests/'
          """
        }
      }
    }
  }

  post {
    success {
      echo "Deployed as ${DOCKERHUB_REPO}:${IMAGE_TAG}"
    }
    failure {
      echo "Build or Deploy failed."
    }
  }
}
