const { execSync } = require('child_process');
const fs = require('fs');
const ping = require('ping');

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

    return (day + "/" + month + "/" + year + " " + hour + ":" + minutes + ":" + seconds);
};

exports.runCommand = (command) => {
    console.log(`Command executed: ${command}.`, 'INFO', 'COMMAND_EXECUTION')
    try {
        const output = execSync(command, { encoding: 'utf-8' }).trim();
        console.log(`Command executed.`, 'INFO', 'COMMAND_EXECUTION')
        return output;
    } catch (error) {
        console.log(`Fail to execute command. Details: Command executed: ${command}.`, 'ERROR', 'COMMAND_EXECUTION')
        console.log(`Fail to execute command. Details: Console output: ${error.message}.`, 'ERROR', 'COMMAND_EXECUTION')
        console.log(`Fail to execute command. Details: Console output: ${error.stdout.toString()}.`, 'ERROR', 'COMMAND_EXECUTION')
        console.log(`Fail to execute command. Details: Console output: ${JSON.stringify(error)}.`, 'ERROR', 'COMMAND_EXECUTION')
        return null;
    }
};

exports.logMessage = (message, type = 'INFO', context = '') => {
    type === 'ERROR' ? console.error(`[error][${context}]: ${message}`) : console.log(`[info][${context}]: ${message}`)
};

exports.autoDetectNetworkInterfaceNames = async (sshUsername, sshPassword, ip) => {

    const command = `sshpass -p '${sshPassword}' ssh -tt ${sshUsername}@${ip} -o StrictHostKeyChecking=no PasswordAuthentication=yes "ifconfig -a | sed 's/[ \t].*//;/^\(lo\|\)$/d'"`;

    try {
        const output = execSync(command, { encoding: 'utf-8' }).trim();
        return {
            status: 'success',
            data: output.replace(/\s/g, '').split(':').filter((el) => el != '' && el != 'lo'),
        }
    } catch (error) {

        return {
            status: 'fail',
            data: { 'error': error.stderr }
        };
    }

};

exports.addMinuteToTimestamp = (diff, timeOnly = false) => {
    var oldDateObj = new Date();
    var newDateNumber = oldDateObj.setMilliseconds(oldDateObj.getMilliseconds() + diff * 60000);
    var newDateObj = new Date(newDateNumber);
    return timeOnly ? newDateObj : `${newDateObj.getFullYear()}${("0" + (newDateObj.getMonth() + 1)).slice(-2)}${("0" + newDateObj.getDate()).slice(-2)}${newDateObj.getHours()}${('0' + newDateObj.getMinutes()).slice(-2)}.${String(newDateObj.getSeconds()).padStart(2, '0')}`
}

exports.pingLoop = (hosts) => {
    let status = true;
    return new Promise(async function (resolve, reject) {
        for (const host of hosts) {
            const res = await ping.promise.probe(host);
            if (!res.alive) { status = false; }
        }
        resolve(status);
    });
}