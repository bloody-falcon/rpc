const { v4: uuidv4 } = require('uuid');
const RPC_CONNECTION_HELPER = require('../connection');
const RPC_CALL_TIMEOUT_MS = 60 * 1000; // 5 seconds


const RPC_CONSUME_HELPER = {
        ALLOWED_FUNCTIONS_LIST: [
                
        ],
        callRPCFunction: async (
                functionName,
                input = {},
        ) => new Promise((resolve, reject) => {
                const correlationId = uuidv4();
                let timer = null;
                try {
                        // Validate functionName
                        if (RPC_CONSUME_HELPER.ALLOWED_FUNCTIONS_LIST.indexOf(functionName) < 0) throw new Error('Invalid RPC function name');
                        // Register listener to wait for response from reply channel
                        // Once received, will respond with result
                        RPC_CONNECTION_HELPER.rpc_response_emitter.once(
                                correlationId,
                                (msg) => {
                                        if (timer) clearTimeout(timer);
                                        const r = JSON.parse(msg.content.toString());
                                        if (r.code && r.code === 200) {
                                                resolve(r.data);
                                        } else {
                                                reject(r.message);
                                        }
                                }
                        );
                        // Call RPC function over channel with input
                        RPC_CONNECTION_HELPER.channel.sendToQueue(
                                functionName,
                                Buffer.from(JSON.stringify(input)),
                                {
                                        correlationId,
                                        replyTo: RPC_CONNECTION_HELPER.rpc_response_queue.queue,
                                }
                        );
                        // Set timeout in case of no response over set time period
                        timer = setTimeout(() => {
                                RPC_CONNECTION_HELPER.rpc_response_emitter.removeAllListeners(correlationId);
                                reject(new Error(`RPC function ${functionName} timed out`));
                        }, RPC_CALL_TIMEOUT_MS);
                } catch (error) {
                        RPC_CONNECTION_HELPER.rpc_response_emitter.removeAllListeners(correlationId);
                        if (timer) clearTimeout(timer);
                        reject(error);
                }
        }),
        setFunctions(_functionList) {
                this.ALLOWED_FUNCTIONS_LIST = _functionList;
                return _functionList;
        },
        addFunction(_function) {
                this.ALLOWED_FUNCTIONS_LIST.push(_function);
                return _function;
        }
};

module.exports = RPC_CONSUME_HELPER;