const functions = require('./functions');
const R = require('r-integration');

const hardware = async (ip,
    sshPassword,
    sshUsername,
    logId) => {

    try {

        functions.logId = logId

        functions.logMessage("Fault injection script has been started.", 'INFO', 'SCRIPT_START')
        const startTime = functions.runCommand("date '+# Start %b %d %H:%M:%S'");
        if (startTime) functions.logMessage(startTime, 'INFO','LOG_EVENT');

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
                TIMER = parseInt(expRepairHW[0]);
                if (!TIMER) break;
            }

            functions.logMessage(`(${C1}) Time to failure: ${TIME}.`, 'INFO', 'TIMER_GENERATED');
            functions.logMessage(`(${C1}) Time to repair: ${TIMER}.`, 'INFO', 'TIMER_GENERATED');

            functions.logMessage(`(${C1}) Waiting for fault time.`, 'INFO', 'WAIT_FAULT_TIME');
            await new Promise(resolve => setTimeout(resolve, TIME * 1000));
            
            functions.logMessage(`(${C1}) Fault injected.`, 'INFO', 'FAULT_INJECTED');

            const faultTime = functions.runCommand("date '+%b %d %H:%M:%S'");
            if (faultTime) functions.logMessage(`(${C1}) Fault ${TIME} ${faultTime}`, 'INFO', 'LOG_EVENT');

            const sshCommand = `sshpass -p '${sshPassword}' ssh -tt ${sshUsername}@${ip} -o StrictHostKeyChecking=no PasswordAuthentication=yes "echo '${sshPassword}' | sudo -S rtcwake -m mem -s ${TIMER}"`;
            const sshResult = functions.runCommand(sshCommand);

            if (sshResult === null) {
                functions.logMessage(`(${C1}) Fail to establish ssh connection commands.`, 'ERROR', 'SSH_CONNECTION')
            }

            const repairTime = functions.runCommand("date '+%b %d %H:%M:%S'");
            if (repairTime) functions.logMessage(`(${C1}) RepairHardware ${TIMER} ${repairTime}`, 'INFO', 'LOG_EVENT');

            functions.logMessage(`(${C1}) Repair injected.`, 'INFO', 'REPAIR_INJECTED');
        }

        const endTime = functions.runCommand("date '+End %b %d %H:%M:%S'");
        if (endTime) functions.logMessage(endTime);

        functions.logMessage(`(${C1}) Finished script.`, 'INFO', 'FINISHED_SCRIPT');
    } catch (error) {
        functions.logMessage(`An unexpected error occurred. Details: ${JSON.stringify(error)}.`, 'ERROR', 'UNEXPECTED_ERROR')
    }
};

exports.hardware = hardware

module.exports = {
    hardware,
}