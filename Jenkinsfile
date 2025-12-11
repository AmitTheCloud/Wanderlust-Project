pipeline {
    agent any

    environment {
        DOCKERHUB_REPO = "asolanki1811/wanderlust"
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        APP_SERVER = "ubuntu@100.31.203.208"   // <-- update this if IP changes
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

        stage('Prepare Deployment Artifacts') {
            steps {
                sh """
                    mkdir -p out
                    sed 's|asolanki1811/wanderlust:latest|${DOCKERHUB_REPO}:${IMAGE_TAG}|g' ${MANIFESTS}/app-deployment.yaml > out/app.yaml
                    cp ${MANIFESTS}/mongo-deployment.yaml out/
                    cp ${MANIFESTS}/ingress.yaml out/ || true
                    tar -czf deploy.tar.gz -C out .
                """
            }
        }

        stage('Clean App Server + Deploy to K8s') {
            steps {
                sshagent(['app-server-ssh']) {
                    sh """
                        echo "Uploading deployment package..."
                        scp -o StrictHostKeyChecking=no deploy.tar.gz ${APP_SERVER}:~/

                        echo "Cleaning old Kubernetes pods and Docker resources..."
                        ssh -o StrictHostKeyChecking=no ${APP_SERVER} '
                            set -e

                            echo "--- Removing old pods ---"
                            kubectl delete pods -l app=wander-app --ignore-not-found=true || true

                            echo "--- Cleaning Docker system ---"
                            sudo docker system prune -af || true

                            echo "--- Preparing deployment directory ---"
                            rm -rf out || true
                            mkdir -p out

                            echo "--- Extracting new files ---"
                            tar -xzf deploy.tar.gz -C out

                            echo "--- Applying K8s manifests ---"
                            kubectl apply -f out/

                            echo "--- Waiting for rollout ---"
                            kubectl rollout status deployment/wander-app --timeout=120s
                        '
                    """
                }
            }
        }
    }

    post {
        success { echo "🚀 Deployment Successful!" }
        failure { echo "❌ Deployment Failed — Check Logs" }
    }
}
