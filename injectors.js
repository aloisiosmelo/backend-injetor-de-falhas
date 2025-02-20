const functions = require('./functions');
const R = require('r-integration');

const hardware = async (ip,
    sshPassword,
    sshUsername,
    experimentAttempts = 30,
    timeToFail,
    timeToRepair,
    networkInterfaceId,
    logId) => {

    try {

        functions.logId = logId

        let experimentCount = 0;

        const timeToFailRate = 1/timeToFail;
        const timeToRepairRate = 1/timeToRepair;


        while (experimentCount < experimentAttempts) {
            experimentCount++;

            const expFailHW = R.executeRCommand(`rexp(1, rate=${timeToFailRate})`);
            const expRepairHW = R.executeRCommand(`rexp(1, rate=${timeToRepairRate})`);

            let TIMER_TO_FAIL = parseFloat(expFailHW[0]).toFixed(2);
            let TIMER_TO_REPAIR = parseInt(expRepairHW[0]).toFixed(2);

            if (isNaN(TIMER_TO_FAIL) || isNaN(TIMER_TO_REPAIR) || !TIMER_TO_FAIL || !TIMER_TO_REPAIR) {
                functions.logMessage(`(${experimentCount}) Invalid time. Details: TIME=${TIMER_TO_FAIL} TIMER_TO_REPAIR=${TIMER_TO_REPAIR}`, 'ERROR', 'TIMER_TO_REPAIR_GEN_PARSE');
                continue;
            }

            while (TIMER_TO_REPAIR < 20) {
                functions.logMessage(`(${experimentCount}) Time less than 20. Recalculating now.`, 'INFO', 'TIMER_TO_REPAIR_GEN');
                let newExpRepairHW = R.executeRCommand(`rexp(1, rate=${timeToRepairRate})`);
                TIMER_TO_REPAIR = parseInt(newExpRepairHW[0]);
                if (!TIMER_TO_REPAIR) break;
            }

            functions.logMessage(`(${experimentCount}) Time to failure: ${TIMER_TO_FAIL}.`, 'INFO', 'TIMER_TO_REPAIR_GENERATED');
            functions.logMessage(`(${experimentCount}) Time to repair: ${TIMER_TO_REPAIR}.`, 'INFO', 'TIMER_TO_REPAIR_GENERATED');
            functions.logMessage(`(${experimentCount}) Trying to connect via ssh.`, 'INFO', 'SSH_CONNECTION_STARTUP');

            const sshCommandForFault = `sshpass -p '${sshPassword}' ssh -tt ${sshUsername}@${ip} -o StrictHostKeyChecking=no PasswordAuthentication=yes 'at -t ${functions.addMinuteToTimestamp(TIMER_TO_FAIL)} <<<"echo ${sshPassword} | sudo -S ip link set ${networkInterfaceId} down"'`;
            const sshCommandForRepair = `sshpass -p '${sshPassword}' ssh -tt ${sshUsername}@${ip} -o StrictHostKeyChecking=no PasswordAuthentication=yes 'at -t ${functions.addMinuteToTimestamp(TIMER_TO_REPAIR)} <<<"echo ${sshPassword} | sudo -S ip link set ${networkInterfaceId} up"'`;

            functions.runCommand(sshCommandForFault) ? functions.logMessage(`(${experimentCount}) Fault injected.`, 'INFO', 'FAULT_INJECTED') : functions.logMessage(`(${experimentCount}) Fail to establish ssh connection commands for fault injection.`, 'ERROR', 'SSH_CONNECTION');
            functions.runCommand(sshCommandForRepair) ? functions.logMessage(`(${experimentCount}) Repair injected.`, 'INFO', 'REPAIR_INJECTED') : functions.logMessage(`(${experimentCount}) Fail to establish ssh connection commands for repair injection.`, 'ERROR', 'SSH_CONNECTION');

            functions.logMessage(`(${experimentCount}) Finished current iteration.`, 'INFO', 'FINISHED_LOOP_SCRIPT');
        }

        functions.logMessage(`(${experimentCount}) Finished script.`, 'INFO', 'FINISHED_SCRIPT');

    } catch (error) {
        functions.logMessage(`An unexpected error occurred. Details: ${JSON.stringify(error)}.`, 'ERROR', 'UNEXPECTED_ERROR')
    }
};

exports.hardware = hardware

module.exports = {
    hardware,
}