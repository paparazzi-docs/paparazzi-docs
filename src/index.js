import puppeteer from "puppeteer";
import {PutObjectCommand, S3Client} from "@aws-sdk/client-s3";

export default class PaparazziDocs {
  constructor() {
    this.s3 = null;
    this.bucketName = null;
    this.keyName = null;
    this.defaultViewPort = null;
  }

  /**
   * Initialize the S3 client
   * @param awsS3Config = {accessKeyId, secretAccessKey, region}
   * @param bucketName
   * @param keyName
   * @param defaultViewPort
   */
  init({
         awsS3Config,
         bucketName,
         keyName,
         defaultViewPort = {width: 1280, height: 720}
       }) {

    if (!awsS3Config) {
      throw new Error('Provide AWS S3 config');
    }
    this.s3 = new S3Client({
      credentials: {
        accessKeyId: awsS3Config.accessKeyId,
        secretAccessKey: awsS3Config.secretAccessKey
      },
      region: awsS3Config.region
    })
    this.bucketName = bucketName;
    this.keyName = keyName; // This is the folder name in the bucket where the screenshots will be uploaded
    this.defaultViewPort = defaultViewPort; // This is the default viewport for the screenshots
  }

  async captureAndUploadScreenshot(url, fileName, options = {}) {
    if (!this.s3) {
      throw new Error('S3 client not initialized. Call init first.');
    }

    const browser = await puppeteer.launch();
    this.page = await browser.newPage();

    await this.page.setViewport(this.defaultViewPort);

    await this.page.goto(url, {waitUntil: 'networkidle2'});

    const screenshotBuffer = await this.page.screenshot(options);

    await browser.close();

    const s3UploadParams = {
      Bucket: this.bucketName,
      Key: `${this.keyName}/${fileName}`,
      Body: screenshotBuffer,
      ContentType: 'image/png',
    };

    const postCommand = new PutObjectCommand(s3UploadParams)

    return new Promise((resolve, reject) => {
      this.s3.send(postCommand, (err, data) => {
        if (err) {
          reject(err);
        } else {
          console.log(data)
        }
      });
    });
  }
}