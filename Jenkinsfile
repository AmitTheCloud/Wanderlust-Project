pipeline {
    agent any

    environment {
        DOCKERHUB_REPO = "asolanki1811/wanderlust"
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        APP_SERVER = "ubuntu@100.31.203.208"   // <-- Update if server IP changes
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
                """
            }
        }

        stage('Load Image Into KIND (Offline Mode)') {
            steps {
                sshagent(['app-server-ssh']) {
                    sh """
                        echo "Saving docker image locally..."
                        docker save ${DOCKERHUB_REPO}:${IMAGE_TAG} -o image.tar

                        echo "Uploading image to app server..."
                        scp -o StrictHostKeyChecking=no image.tar ${APP_SERVER}:~/

                        echo "Loading image into KIND cluster..."
                        ssh -o StrictHostKeyChecking=no ${APP_SERVER} "
                            kind load image-archive image.tar --name aavams-cluster
                        "
                    """
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                sshagent(['app-server-ssh']) {
                    sh """
                        echo "Packaging manifests..."
                        tar -czf deploy.tar.gz -C out .

                        echo "Uploading manifests..."
                        scp -o StrictHostKeyChecking=no deploy.tar.gz ${APP_SERVER}:~/

                        echo "Deploying to KIND..."
                        ssh -o StrictHostKeyChecking=no ${APP_SERVER} "
                            rm -rf out || true
                            mkdir -p out
                            tar -xzf deploy.tar.gz -C out

                            echo 'Applying manifests...'
                            kubectl apply -f out/

                            echo 'Waiting for rollout...'
                            kubectl rollout status deployment/wander-app --timeout=180s
                        "
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