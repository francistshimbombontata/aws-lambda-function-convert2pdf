import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { parse } from 'path';
import util from 'util';

//On crée un object S3 Client
const s3 = new S3Client({ region: 'us-east-1' });

//On définit la fonction 'handler'
export const handler = async (event, context) => {
    //On récupère les valeurs du bucket et du fichier à convertir
    console.log("Lecture des objets (bucket et key) à partir du paramètre event:\n", util.inspect(event, { depth: 5 }));

    const srcBucket = event.Records[0].s3.bucket.name;
    const srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));

    console.log("Le bucket source est : ", srcBucket);
    console.log("Le nom du fichier source est : ", srcKey);



    const path = srcKey.substring(0, srcKey.lastIndexOf('/') + 1);
    const filename = srcKey.substring(srcKey.lastIndexOf('/') + 1);
    console.log("Le chemin du fichier source est  : ", path);
    console.log("Le nom complet du fichier source est : ", filename);

    //
    // Récupérer le document (docx) à partir du bucket source
    try {
        const getObjectParams = {
            Bucket: srcBucket,
            Key: srcKey
        };
        const response = await s3.send(new GetObjectCommand(getObjectParams));
        const stream = response.Body;

        //Convertir l'objet 'stream' en objet 'buffer'
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        //
        const inputFileBuffer = Buffer.concat(chunks);
        await fs.writeFile('/tmp/' + filename, inputFileBuffer);

        //
        //Conversion du fichier
        console.log('Début de conversion du fichier : ', filename)
        //On exécute la commande 'LibreOffice' pour effectuer la conversion

        execSync(`
                cd /tmp
                libreoffice7.6 --headless --invisible --nodefault --view --nolockcheck --nologo --norestore --convert-to pdf --outdir /tmp ./${filename}
                `);

        /*
        execSync(`
                cd /tmp
                libreoffice7.6 --headless --invisible --nodefault --view --nolockcheck --nologo --norestore --convert-to pdf --outdir /tmp ./${filename}
            `, { stdio: 'ignore' });
        */
        //
        console.log("Fin de conversion du fichier : ")
        //
        const outputFilename = parse(filename).name + '.pdf';

        const outputFileBuffer = await fs.readFile('/tmp/' + outputFilename);
        //
        const dstBucket = "fichiers-sortants";
        const dstKey = path + outputFilename;
        console.log("Le chemin du fichier converti est : ", dstKey);
        console.log("Le nom complet du fichier converti est : ", filename);

        //Charger le fichier PDF converti au  bucket de destination.
        const putObjectParams = {
            Bucket: dstBucket,
            Key: dstKey,
            Body: outputFileBuffer,
            ContentType: 'application/pdf'
        };
        await s3.send(new PutObjectCommand(putObjectParams));

        console.log('Fichier ' + srcBucket + '/' + srcKey + ' conveti avec succès et chargé dans ' + dstBucket + '/' + dstKey);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Fichier converti avec succès', key: dstKey })
        };

    } catch (error) {
        console.error("Une erreur s'est produite lors de la conversion du document :", error);
        return {
            statusCode: 500,
            body: JSON.stringify('Conversion échouée')
        };
    }
    //
}