const { execSync } = require('child_process');
const fs = require('fs');

exports.logId = null

exports.generateUniqueRandomSequence = () => Math.floor(Math.random() * Date.now())

exports.currentDateTimeFormated = () => {

    const checkZero = (data) => data.length == 1 ? data = "0" + data : data

    var today = new Date();
    var day = today.getDate() + "";
    var month = (today.getMonth() + 1) + "";
    var year = today.getFullYear() + "";
    var hour = today.getHours() + "";
    var minutes = today.getMinutes() + "";
    var seconds = today.getSeconds() + "";

    day = checkZero(day);
    month = checkZero(month);
    year = checkZero(year);
    hour = checkZero(hour);
    minutes = checkZero(minutes);
    seconds = checkZero(seconds);

    return(day + "/" + month + "/" + year + " " + hour + ":" + minutes + ":" + seconds);
};

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
    this.saveLogToFrontend({ message: message, time: this.currentDateTimeFormated() })
};

exports.autoDetectNetworkInterfaceNames = async (sshUsername, sshPassword, ip) => {

    const command = `sshpass -p '${sshPassword}' ssh -tt ${sshUsername}@${ip} -o StrictHostKeyChecking=no PasswordAuthentication=yes "ifconfig -a | sed 's/[ \t].*//;/^\(lo\|\)$/d'"`;

    try {
        const output = execSync(command, { encoding: 'utf-8' }).trim();
        return {
            status: 'success',
            data: output.replace(/\s/g, '').split(':').filter((el)=> el != '' && el != 'lo'),
        }
    } catch (error) {

        return {
            status: 'fail',
            data: { 'error': error.stderr }
        };
    }

};