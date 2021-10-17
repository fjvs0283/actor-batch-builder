const Apify = require('apify');

const { utils: { log } } = Apify;

Apify.main(async () => {

    const token = process.env.APIFY_TOKEN;
    const accountClient = Apify.newClient({ token: token });
    const actorCollectionClient = await accountClient.actors();
    const { items } = await actorCollectionClient.list();

    const { actorNameText } = await Apify.getInput()

    log.info('Starting builds...')
    log.info('–––––––––––––––––––––––––––––––––––––––––')

    let actorIds = [];
    let actorCount = 0;
    for (const item in items) {
        if (items[item].name.includes(actorNameText)) {
            const actorName = items[item].name;
            const actorId = items[item].id
            const actorClient = await accountClient.actor(actorId);
            try {
                const startBuild = await actorClient.build('0.0');
                actorIds.push(actorId);
                actorCount++;

                log.info(`${actorCount}.`)
                log.info(`actor name: ${actorName}`);
                log.info(`build id:   ${startBuild.id}`);
                log.info(`started at: ${startBuild.startedAt}`);
                log.info(`status:     ${startBuild.status}`);
                log.info('–––––––––––––––––––––––––––––––––––––––––')
            } catch (error) {
                log.warning(`skipping actor ${actorName} due to ${error.type}.`);
                log.warning(`actor id: ${actorId}`)
                log.info('–––––––––––––––––––––––––––––––––––––––––')
            }

        }
    }
    log.info(`builds started for ${actorCount} actors.`);
    log.info('waiting for builds to finish...');
    log.info('–––––––––––––––––––––––––––––––––––––––––')
    await Apify.utils.sleep(15 * 1000);

    let requestedBuildsCount = 0;
    let successBuildsCount = 0;
    let failedBuildsCount = 0;

    for (const actorId in actorIds) {
        let buildFinshed = false;
        const actorClient = await accountClient.actor(actorIds[actorId]);
        const actor = await actorClient.get();

        while (!buildFinshed) {
            const actorBuilds = await actorClient.builds().list({ 'desc': true });
            const buildStatus = actorBuilds.items[0].status;
            const buildFinshedAt = actorBuilds.items[0].finishedAt;

            if (buildStatus == 'RUNNING') {
                buildFinshed = false;

            } else if (buildStatus == 'SUCCEEDED') {
                requestedBuildsCount++;
                successBuildsCount++;

                log.info(`${requestedBuildsCount}.`);
                log.info(`actor name:  ${actor.name}`);
                log.info(`finished at: ${buildFinshedAt}`);
                log.info(`status:      ${buildStatus}`);
                log.info('–––––––––––––––––––––––––––––––––––––––––')
                buildFinshed = true;

            } else if (buildStatus == 'FAILED') {
                requestedBuildsCount++;
                failedBuildsCount++;

                log.error(`${requestedBuildsCount}.`);
                log.error(`actor name:  ${actor.name}`);
                log.error(`finished at: ${buildFinshedAt}`);
                log.error(`status:      ${buildStatus}`);
                log.info('–––––––––––––––––––––––––––––––––––––––––')
                buildFinshed = true;
            }
        }
        await Apify.utils.sleep(1 * 1000);
    }
    log.info('Done.')
    log.info(`total builds requested:  ${requestedBuildsCount}`);
    log.info(`total builds successful: ${successBuildsCount}`);
    log.info(`total builds failed:     ${failedBuildsCount}`);
});