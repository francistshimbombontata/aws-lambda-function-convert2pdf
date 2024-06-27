# syntax=docker/dockerfile:1

# On va utiliser comme Docker Image de base 
# voir : https://github.com/shelfio/libreoffice-lambda-base-image/tree/master
FROM public.ecr.aws/shelf/lambda-libreoffice-base:7.6-node20-x86_64

# On copie notre Fonction Lambda dans le répertoire de Fonctions Lambda de AWS
# Voir https://docs.aws.amazon.com/lambda/latest/dg/nodejs-image.html#nodejs-image-instructions
COPY index.mjs ${LAMBDA_TASK_ROOT}

# On définit la commande pour exécuter notre fonction lambda
CMD [ "index.handler" ]