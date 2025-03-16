const { execSync, spawn } = require('child_process');
const ping = require('ping');
const R = require('r-integration');

const isEmpty = (str) => (str === '' || str == undefined || str == null) ? true : false;

exports.currentDateTimeFormated = (nextDate, short) => {

    const checkZero = (data) => data.length == 1 ? data = "0" + data : data

    var today = nextDate ? new Date(nextDate) : new Date();
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

    return !short ? (day + "/" + month + "/" + year + " " + hour + ":" + minutes + ":" + seconds) : (hour + ":" + minutes + ":" + seconds);
};

exports.runCommand = (command) => {
    console.log(`Command executed: ${command}.`, 'INFO', 'COMMAND_EXECUTION')

    return spawn(command, [], {
        shell: true,
        detached: true,
        stdio: 'ignore'
    });
};

exports.autoDetectNetworkInterfaceNames = async (sshUsername, sshPassword, ip) => {

    const command = "sshpass -p " + sshPassword + " ssh " + sshUsername + "@" + ip + " ifconfig -a | sed 's/[ \t].*//;/^\(lo\|\)$/d'";

    try {
        const output = execSync(command, { encoding: 'utf-8' }).toString().trim();

        return {
            status: 'success',
            data: output.replace(/\s/g, '').split(':').filter((el) => el != '' && el != 'lo'),
        }

    } catch (error) {
        return {
            status: 'fail',
            data: { 'error': error?.stderr }
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

exports.generateTimers = async (req) => {
    const timeToFailRate = 1 / parseInt(req.timeToFail);
    const timeToRepairRate = 1 / parseInt(req.timeToRepair);

    do {

        let expFailHW = R.executeRCommand(`rexp(1, rate=${timeToFailRate})`);
        let expRepairHW = R.executeRCommand(`rexp(1, rate=${timeToRepairRate})`);
    
        var TIMER_TO_FAIL = parseFloat(expFailHW[0]).toFixed(2);
        var TIMER_TO_REPAIR = parseInt(expRepairHW[0]).toFixed(2);

    } while( (TIMER_TO_FAIL <= 0 || TIMER_TO_REPAIR <= 0) && (TIMER_TO_REPAIR < TIMER_TO_FAIL) );


    return (isNaN(TIMER_TO_FAIL) || isNaN(TIMER_TO_REPAIR) || !TIMER_TO_FAIL || !TIMER_TO_REPAIR) ? null : {
        timeToFail: TIMER_TO_FAIL,
        timeToRepair: TIMER_TO_REPAIR,
    }
}

exports.validate = async (req) => {

    if (isEmpty(req?.ip) || isEmpty(req?.sshUsername) || isEmpty(req?.sshPassword)
        || isEmpty(req?.autoDetectNetworkInterfaceId) || isEmpty(req?.injectionType) || isEmpty(req?.timeToFail)
        || isEmpty(req?.timeToRepair) || isEmpty(req?.experimentAttempts)) {
        return {
            status: 'error',
            error: 'All fields is required',
        };
    }

    if (!req?.injectionType) {
        return {
            status: 'error',
            error: 'injectionType cannot be empty',
        };
    }

    if (req?.timeToFail <= 0) {
        return {
            status: 'error',
            error: 'timeToFail cannot be less than or equal to zero',
        };
    }

    if (req?.timeToRepair <= 0) {
        return {
            status: 'error',
            error: 'timeToRepair cannot be less than or equal to zero',
        };
    }

    if (!req?.autoDetectNetworkInterfaceId && (req?.networkInterfaceId == '' || req?.networkInterfaceId == undefined || req?.networkInterfaceId == null)) {
        return {
            status: 'error',
            error: 'networkInterfaceId cannot be empty',
        };
    }

    return {
        status: true,
        error: null,
    };
}

exports.detectHardwareInterfaceId = async (req) => {
    console.log('[info][START_SERVER] Trying to detect network interfaces')
    let interfaceIndentifierResp = await this.autoDetectNetworkInterfaceNames(req?.sshUsername, req?.sshPassword, req?.ip);
    return (interfaceIndentifierResp.status === 'success') ? interfaceIndentifierResp.data : []
}

exports.waitForSeconds = async (seconds) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, seconds * 1000);
    });
}

exports.waitForATime = (horarioString) => {

    const horario = new Date(horarioString);
    const agora = new Date();
    const tempoParaEsperar = horario.getTime() - agora.getTime(); // Calcula a diferença em milissegundos

    if (tempoParaEsperar <= 0) {
        console.log("O horário já passou!");
        return Promise.resolve("O horário especificado já passou.");
    }

    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(`Esperou até ${horario.toLocaleTimeString()}`);
        }, tempoParaEsperar);
    });
}