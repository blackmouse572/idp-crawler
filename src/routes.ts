import { createPuppeteerRouter, Dataset } from 'crawlee';
import { CrawDataDocument } from './database/crawdata.schema.js';

export const router = createPuppeteerRouter();

router.addDefaultHandler(async ({ enqueueLinks, page, log }) => {
    log.info(`Enqueueing new URLs: ${page.url()}`);
    await page.waitForSelector('#featuredInstSlot');

    await enqueueLinks({
        selector: 'div[sectionid="scholarship-listing-card-component"] a.btn',
        label: 'detail',
    });
    const nextPageSelector = 'a[role="link"][aria-label="Go to next page"]';
    const nextButton = await page.$(nextPageSelector);

    // if the a has className cursor-auto, it means the button is disabled
    const isNextButtonDisabled = await nextButton?.evaluate((e) =>
        e.className.includes('cursor-auto')
    );
    if (nextButton && !isNextButtonDisabled) {
        await enqueueLinks({
            selector: nextPageSelector,
        });
    }
});

router.addHandler('detail', async ({ request, page, log }) => {
    const title = await page.title();
    log.info(`Get details: ${title}`, { url: request.loadedUrl });
    try {
        const logoNode = await page.$(
            '#scholarship-details-banner img:first-child'
        );
        const titleNode = await page.$('#scholarship-details-banner h1');
        const locationNode = await page.$(
            '#scholarship-details-basic-info div:nth-child(1) > p:nth-child(2)'
        );
        const levelNode = await page.$(
            '#scholarship-details-basic-info div:nth-child(2) > p:nth-child(2)'
        );
        const descriptionNodes = await page.$$('.accordion');

        const logo = await logoNode?.evaluate((e) => e.getAttribute('src'));
        const label = await titleNode?.evaluate((e) => e.textContent);
        const location = await locationNode?.evaluate((e) => e.textContent);
        const level = await levelNode?.evaluate((e) => e.textContent);
        const description = await Promise.all(
            descriptionNodes.map((e) => e.evaluate((el) => el.textContent))
        ).then((e) => e.join('\n'));

        await Dataset.pushData({
            title,
            label,
            location,
            level,
            logo,
            description,
        });
        const dataset = new CrawDataDocument({
            title,
            href: request.loadedUrl,
            label,
            location,
            level,
            logo,
            description,
        });

        await dataset
            .save({})
            .then((e) => {
                if (!e.errors) {
                    log.info(`Saved: ${title}`, { url: request.loadedUrl });
                }
            })
            .catch((err) => {
                // if the URL is already saved, we can ignore the error
                if (err.code !== 11000) {
                    throw err;
                }
                log.info(`URL already saved: ${title}`);
            });
    } catch (error) {
        console.error('Error:', error);
        log.error('Error while saving data', { url: request.loadedUrl });
    }
});
