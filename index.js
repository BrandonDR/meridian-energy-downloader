#!/bin/node

const puppeteer = require('puppeteer');
const fs = require('fs');
require('dotenv').config();

const args = process.argv.slice(2);
const headless = !args.includes('--disable-headless');

(async () => {
    const downloadFolder = process.cwd() + '/meridian-temp-downloads';
    if (fs.existsSync(downloadFolder)) {
        fs.rmSync(downloadFolder, { recursive: true, force: true });
    }
    fs.mkdirSync(downloadFolder);

    const browser = await puppeteer.launch({
        headless,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });
    const page = await browser.newPage();
    await page.goto('https://account.meridianenergy.co.nz/ssp/#/sign-in');
    await page.waitForSelector('#email');
    await page.type('#email', process.env.MERIDIAN_EMAIL);
    await page.type('#password', process.env.MERIDIAN_PASSWORD);
    await page.click('#login-button');
    await page.waitForTimeout(5000);

    await page.click('#usage-tab');
    await page.waitForSelector('#usage_show_registers');
    await page.click('#usage_show_registers');

    const client = await page.target().createCDPSession();

    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadFolder
    });

    await page.waitForTimeout(1000);
    await page.click('[value="Download"]');

    let files = [];
    for (let i = 0; i < 90; i++) {
        files = fs.readdirSync(downloadFolder);
        if (files.length) {
            break;
        }
        await page.waitForTimeout(1000);
    }
    console.log(files);

    await browser.close();

    if (files.length) {
        fs.copyFileSync(downloadFolder + '/' + files[0], './meridian-lastest.csv');
    }
    if (fs.existsSync(downloadFolder)) {
        fs.rmSync(downloadFolder, { recursive: true, force: true });
    }
})();