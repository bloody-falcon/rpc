const _ = require('lodash');
const amqp = require('amqplib');
const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');
const {
    HandleRPCFunction
} = require('./response');

const RPC_HELPER = {
    // MQ Variables
    connection: null,
    channel: null,
    // RPC MQ Variables
    rpc_response_queue: null,
    rpc_response_emitter: null,
    rpc_timeout_ms: 60 * 5,
    rpc_event_exchange_name: "",
    rpc_domain_name: "",
    setRPCTimeout(time) {
        RPC_HELPER["rpc_timeout_ms"] = time;
    },
    setRPCEventExchangeName(name) {
        RPC_HELPER["rpc_event_exchange_name"] = name;
    },
    setRPCDomainName(name) {
        RPC_HELPER["rpc_domain_name"] = name;
    },
    /**
     * @connect
     * @public
     */
    async connect({
        RABBIT_MQ_URL,
        RABBIT_MQ_PORT,
        RABBIT_MQ_USERNAME,
        RABBIT_MQ_PWD,
        RABBIT_MQ_VHOST
    }) {
        try {
            // rabbitmq connection string
            const rmqURL = `amqp://${RABBIT_MQ_USERNAME}:${RABBIT_MQ_PWD}@${RABBIT_MQ_URL}${(RABBIT_MQ_PORT) ? `:${RABBIT_MQ_PORT}` : ''}${(RABBIT_MQ_VHOST) ? `/${RABBIT_MQ_VHOST}` : ''}`;
            // Connection and Channel setup
            RPC_HELPER.connection = await amqp.connect(rmqURL);
            RPC_HELPER.channel = await RPC_HELPER.connection.createChannel();
            // Prefetch = 1 
            // only can have 1 msg processing at any point in time
            RPC_HELPER.channel.prefetch(1);
            // Setup single queue for RPC function calls 
            // with event emitter for waiting on responses
            RPC_HELPER.rpc_response_queue = await RPC_HELPER.channel.assertQueue('', {
                exclusive: true,
            });
            RPC_HELPER.rpc_response_emitter = new EventEmitter();
            RPC_HELPER.rpc_response_emitter.setMaxListeners(0);
            RPC_HELPER.channel.consume(
                RPC_HELPER.rpc_response_queue.queue,
                (msg) => {
                    RPC_HELPER.rpc_response_emitter.emit(
                        msg.properties.correlationId,
                        msg,
                    );
                },
                {
                    noAck: true,
                }
            );
        } catch (error) {
            throw error;
        }
    },
    async callRPC(
        functionName,
        input = {},
    ) {
        return new Promise((resolve, reject) => {
            const correlationId = uuidv4();
            let timer = null;
            try {          
                // Register listener to wait for response from reply channel
                // Once received, will respond with result
                RPC_HELPER.rpc_response_emitter.once(
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
                RPC_HELPER.channel.sendToQueue(
                    functionName,
                    Buffer.from(JSON.stringify(input)),
                    {
                        correlationId,
                        replyTo: RPC_HELPER.rpc_response_queue.queue,
                    }
                );
                // Set timeout in case of no response over set time period
                timer = setTimeout(() => {
                    RPC_HELPER.rpc_response_emitter.removeAllListeners(correlationId);
                    reject(new Error(`RPC function ${functionName} timed out`));
                }, RPC_HELPER.rpc_timeout_ms);
            } catch (error) {
                RPC_HELPER.rpc_response_emitter.removeAllListeners(correlationId);
                if (timer) clearTimeout(timer);
                reject(error);
            }
        });
    },
    async emitEvent(
        eventkey, 
        data = {},
    ) {
        try {
            // Validate eventkey
            // Assert Exchange Exists (if not create)
            await RPC_HELPER.channel.assertExchange(
                RPC_HELPER["rpc_event_exchange_name"],
                'topic',
                { durable: true, },
            );
            // Emit eventkey with data
            await RPC_HELPER.channel.publish(
                RPC_HELPER["rpc_event_exchange_name"],
                eventkey,
                Buffer.from(JSON.stringify(data)),
            );
            return true;
        } catch (error) {
            return false;
        }
    },
    async on(
        key,
        type,
        func
    ) { 
        if (type == "event") {
            RPC_HELPER.channel.assertExchange(
                RPC_HELPER["rpc_event_exchange_name"],
                'topic',
                { durable: true, }
            );
            // Asset Queue assigned to exchange (if not create)
            // 1 Unique queue per domain to be able to handle multiple workers
            const q = await RPC_HELPER.channel.assertQueue(
                // ensure unique for each domain API
                `${RPC_HELPER["rpc_domain_name"]}-event-listener-queue`.toLowerCase(),
                { exclusive: false, },
            );
            RPC_HELPER.channel.bindQueue(
                q.queue,
                RPC_HELPER["rpc_event_exchange_name"],
                key,
            );
            console.log(`-> "${key}" event has been setup`);
            // Consume messages based on listening routing key
            RPC_HELPER.channel.consume(
                q.queue,
                async (msg) => {
                    const k = msg.fields.routingKey;
                    const c = JSON.parse(msg.content.toString());
                    if (key == "#" || key == k) {
                        const r = await HandleRPCFunction(func, c, k);
                    }
                    RPC_HELPER.channel.ack(msg);
                }, {
                    noAck: false,
                }
            );
        } else {
            const queueName = `${RPC_HELPER["rpc_domain_name"]}.${key}`.toLowerCase();
            RPC_HELPER.channel.assertQueue(
                queueName,
                { durable: false, }
            );
            RPC_HELPER.channel.consume(
                queueName,
                async (msg) => {
                    // console.log("msg", msg)
                    const {
                        replyTo,
                        correlationId,
                    } = msg.properties;
                    const c = JSON.parse(msg.content.toString());
                    const r = await HandleRPCFunction(func, c, key);
                    /** Reply response to replyTo queue */
                    RPC_HELPER.channel.sendToQueue(
                        replyTo,
                        Buffer.from(JSON.stringify(r)),
                        { correlationId, },
                    );
                    RPC_HELPER.channel.ack(msg);
                }
            );
        }
    }
};

module.exports = RPC_HELPER;
