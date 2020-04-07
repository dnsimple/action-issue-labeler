const core = require('@actions/core');
const fs = require('fs');
const yaml = require('js-yaml');
const github = require('@actions/github');
const regexParser = require("regex-parser");


// most @actions toolkit packages have async methods
async function run() {
  try {
    const token = core.getInput('repo-token', {required: true});
    const configPath = core.getInput('configuration-path', {required: true});

    const client = new github.GitHub(token);

    const config = await loadConfig(configPath)
    core.debug(`Loaded configuration ${JSON.stringify(config)}`)

    const labels = await determineLables(github.context.payload.issue.body, config)
    core.info(`The following ${ labels.length } lables will be applied: ${ labels.join(',') }`)

    if (labels.length > 0) {
      addLabels(client, github.context.payload.issue.number, labels)
    }
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

async function loadConfig(path) {
  let config = yaml.safeLoad(fs.readFileSync(path, 'utf8'))

  Object.keys(config).map((key) => {
    config[key] = config[key].map((regex) => { return regexParser(regex) })
  })

  return config
}

async function determineLables(issue, config) {
  return Object.keys(config).filter((label) => {
    return config[label].some((regex) => { return regex.test(issue) })
  })
}

async function addLabels(client, issueNr, labels)  {
  await client.issues.addLabels({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      issue_number: issueNr,
      labels: labels
    });
}

run()
