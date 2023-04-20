const amqp = require('amqplib');
const EventEmitter = require('events');

const RPC_CONNECTION_HELPER = {

    // MQ Variables
    connection: null,
    channel: null,
    // RPC MQ Variables
    rpc_response_queue: null,
    rpc_response_emitter: null,

    connect: async({
        RABBIT_MQ_URL,
        RABBIT_MQ_PORT,
        RABBIT_MQ_USERNAME,
        RABBIT_MQ_PWD,
        RABBIT_MQ_VHOST
    }) => {
        try {
            // rabbitmq connection string
            const rmqURL = `amqp://${RABBIT_MQ_USERNAME}:${RABBIT_MQ_PWD}@${RABBIT_MQ_URL}${(RABBIT_MQ_PORT) ? `:${RABBIT_MQ_PORT}` : ''}${(RABBIT_MQ_VHOST) ? `/${RABBIT_MQ_VHOST}` : ''}`;
            // Connection and Channel setup
            RPC_CONNECTION_HELPER.connection = await amqp.connect(rmqURL);
            RPC_CONNECTION_HELPER.channel = await RPC_CONNECTION_HELPER.connection.createChannel();
            // Prefetch = 1 
            // only can have 1 msg processing at any point in time
            RPC_CONNECTION_HELPER.channel.prefetch(1);
            // Setup single queue for RPC function calls 
            // with event emitter for waiting on responses
            RPC_CONNECTION_HELPER.rpc_response_queue = await RPC_CONNECTION_HELPER.channel.assertQueue('', {
                exclusive: true,
            });
            RPC_CONNECTION_HELPER.rpc_response_emitter = new EventEmitter();
            RPC_CONNECTION_HELPER.rpc_response_emitter.setMaxListeners(0);
            RPC_CONNECTION_HELPER.channel.consume(
                RPC_CONNECTION_HELPER.rpc_response_queue.queue,
                (msg) => {
                    RPC_CONNECTION_HELPER.rpc_response_emitter.emit(
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
};

module.exports = RPC_CONNECTION_HELPER;