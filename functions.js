const { execSync } = require('child_process');
const fs = require('fs');

exports.logId = null

exports.generateUniqueRandomSequence = () => Math.floor(Math.random() * Date.now())

exports.saveLogToFrontend = async (content) => {

    const filePath = `logs/${this.logId}.json`;
    const data = fs.readFileSync(filePath, 'utf8');

    if (data) {
        let dataJson = JSON.parse(data);
        let newContent = dataJson.concat(content);

        try {
            fs.writeFileSync(filePath, JSON.stringify(newContent, null, 2), 'utf8');
        } catch (error) {
            console.error(`[error][logMessage]: Log could not be saved.`);
            console.error(`[error][logMessage]: Details: Console output: ${JSON.stringify(error)}`);
        }

    }
}

exports.runCommand = (command) => {
    this.logMessage(`Command executed: ${command}.`, 'INFO', 'COMMAND_EXECUTION')
    try {
        const output = execSync(command, { encoding: 'utf-8' }).trim();
        this.logMessage(`Command executed.`, 'INFO', 'COMMAND_EXECUTION')
        return output;
    } catch (error) {
        this.logMessage(`Fail to execute command. Details: Command executed: ${command}.`, 'ERROR', 'COMMAND_EXECUTION')
        this.logMessage(`Fail to execute command. Details: Console output: ${error.message}.`, 'ERROR', 'COMMAND_EXECUTION')
        this.logMessage(`Fail to execute command. Details: Console output: ${error.stdout.toString()}.`, 'ERROR', 'COMMAND_EXECUTION')
        this.logMessage(`Fail to execute command. Details: Console output: ${JSON.stringify(error)}.`, 'ERROR', 'COMMAND_EXECUTION')
        return null;
    }
};

exports.logMessage = (message, type = 'INFO', context = '') => {
    type === 'ERROR' ? console.error(`[error][${context}]: ${message}`) : console.log(`[info][${context}]: ${message}`)
    this.saveLogToFrontend({ message: message })
};
