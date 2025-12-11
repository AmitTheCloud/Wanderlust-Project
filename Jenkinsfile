pipeline {
  agent any

  environment {
    DOCKERHUB_REPO = "asolanki1811/wanderlust"
    IMAGE_TAG = "${env.BUILD_NUMBER}"
    APP_SERVER = "ubuntu@100.31.203.208"   // <-- PUT YOUR IP HERE
    MANIFESTS = "k8s"
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Docker Build & Push') {
      steps {
        script {
          docker.withRegistry('https://index.docker.io/v1/', 'dockerhub') {
            def img = docker.build("${DOCKERHUB_REPO}:${IMAGE_TAG}")
            img.push()
          }
        }
      }
    }

    stage('Deploy to Cluster') {
      steps {
        sh """
          mkdir -p out
          sed 's|asolanki1811/wanderlust:latest|${DOCKERHUB_REPO}:${IMAGE_TAG}|g' ${MANIFESTS}/app-deployment.yaml > out/app.yaml
          cp ${MANIFESTS}/mongo-deployment.yaml out/
          cp ${MANIFESTS}/ingress.yaml out/ || true
          tar -czf deploy.tar.gz -C out .
        """

        sshagent(['app-server-ssh']) {
          sh """
            ssh -o StrictHostKeyChecking=no ${APP_SERVER} '
            mkdir -p out &&
            tar -xzf deploy.tar.gz -C out &&
            kubectl apply -f out/
            '
          """
        }
      }
    }
  }

  post {
    success { echo "Deployment completed successfully!" }
    failure { echo "Pipeline failed. Check logs." }
  }
}
