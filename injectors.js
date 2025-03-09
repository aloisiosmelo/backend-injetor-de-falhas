const functions = require('./functions');

const hardware = async (ip,
    sshPassword,
    sshUsername,
    timeToFail,
    timeToRepair,
    networkInterfaceId,
) => {

    let faultInjected = false;
    let repairInjected = false;
    let errorText = '';

    try {
        const sshCommandForFault = `sshpass -p '${sshPassword}' ssh -tt ${sshUsername}@${ip} -o StrictHostKeyChecking=no PasswordAuthentication=yes 'at -t ${timeToFail} <<<"echo ${sshPassword} | sudo -S ip link set ${networkInterfaceId} down"'`;
        const sshCommandForRepair = `sshpass -p '${sshPassword}' ssh -tt ${sshUsername}@${ip} -o StrictHostKeyChecking=no PasswordAuthentication=yes 'at -t ${timeToRepair} <<<"echo ${sshPassword} | sudo -S ip link set ${networkInterfaceId} up"'`;

        faultInjected = functions.runCommand(sshCommandForFault) ? true : false;
        repairInjected = functions.runCommand(sshCommandForRepair) ? true : false;

    } catch (error) {
        errorText = `An unexpected error occurred. Details: ${JSON.stringify(error)}.`;
        console.log(errorText);
    }

    console.log('Finished inject script')
    console.log(faultInjected && repairInjected ? '[INFO] Fault and repair has been injected' : '[Error] Fail to inject')
};

exports.hardware = hardware

module.exports = {
    hardware,
}