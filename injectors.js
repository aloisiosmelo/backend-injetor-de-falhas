const functions = require('./functions');
const R = require('r-integration');

const hardware = async (ip,
    sshPassword,
    sshUsername,
    logId) => {

    try {

        functions.logId = logId

        let C1 = 0;

        while (C1 < 50) {
            C1++;

            const expFailHW = R.executeRCommand("rexp(1, rate=0.00001902587519)");
            const expRepairHW = R.executeRCommand("rexp(1, rate=0.006944444444444)");

            let TIME = parseFloat(expFailHW[0]);
            let TIMER = parseInt(expRepairHW[0]);

            if (isNaN(TIME) || isNaN(TIMER) || !TIME || !TIMER) {
                functions.logMessage(`(${C1}) Invalid time. Details: TIME=${TIME} TIMER=${TIMER}`, 'ERROR', 'TIMER_GEN_PARSE');
                continue;
            }

            while (TIMER < 20) {
                functions.logMessage(`(${C1}) Time less than 20. Recalculating now.`, 'INFO', 'TIMER_GEN');
                let newExpRepairHW = R.executeRCommand("rexp(1, rate=0.006944444444444)");
                TIMER = parseInt(newExpRepairHW[0]);
                if (!TIMER) break;
            }

            functions.logMessage(`(${C1}) Time to failure: ${TIME}.`, 'INFO', 'TIMER_GENERATED');
            functions.logMessage(`(${C1}) Time to repair: ${TIMER}.`, 'INFO', 'TIMER_GENERATED');
            functions.logMessage(`(${C1}) Trying to connect via ssh.`, 'INFO', 'SSH_CONNECTION_STARTUP');

            const sshCommandForFault = `sshpass -p '${sshPassword}' ssh -tt ${sshUsername}@${ip} -o StrictHostKeyChecking=no PasswordAuthentication=yes 'at now +${TIME * 1000} min <<<"echo ${sshPassword} | sudo -S ip link set ens33 down"'`;
            const sshCommandForRepair = `sshpass -p '${sshPassword}' ssh -tt ${sshUsername}@${ip} -o StrictHostKeyChecking=no PasswordAuthentication=yes 'at now +${TIME * 1000} min <<<"echo ${sshPassword} | sudo -S ip link set ens33 up"'`;
            
            functions.runCommand(sshCommandForFault) ? functions.logMessage(`(${C1}) Fault injected.`, 'INFO', 'FAULT_INJECTED') : functions.logMessage(`(${C1}) Fail to establish ssh connection commands for fault injection.`, 'ERROR', 'SSH_CONNECTION');
            functions.runCommand(sshCommandForRepair) ? functions.logMessage(`(${C1}) Repair injected.`, 'INFO', 'REPAIR_INJECTED') : functions.logMessage(`(${C1}) Fail to establish ssh connection commands for repair injection.`, 'ERROR', 'SSH_CONNECTION');
            
            functions.logMessage(`(${C1}) Finished current iteration.`, 'INFO', 'FINISHED_LOOP_SCRIPT');
        }

        functions.logMessage(`(${C1}) Finished script.`, 'INFO', 'FINISHED_SCRIPT');

    } catch (error) {
        functions.logMessage(`An unexpected error occurred. Details: ${JSON.stringify(error)}.`, 'ERROR', 'UNEXPECTED_ERROR')
    }
};

exports.hardware = hardware

module.exports = {
    hardware,
}