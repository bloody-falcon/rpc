const _ = require('lodash');

const RPC_CONNECTION_HELPER = require('./connection');
const RPC_EXPOSE_FUNCTION_HELPER = require('./expose');
const RPC_EVENT_SUBSCRIBE_HELPER = require('./subscribe');

const RPC_HELPER = {
    loadExposeFunctionQueues: async ({
    	API_DOMAIN_NAME
    }) => {
        LOG_HELPER.info('Loading RPC expose functions');
        const queueKeys = _.keys(RPC_EXPOSE_FUNCTION_HELPER);
        queueKeys.forEach((k) => {
            const queueName = `${API_DOMAIN_NAME}.${k}`.toLowerCase();
            RPC_CONNECTION_HELPER.channel.assertQueue(
                queueName,
                { durable: false, }
            );
            RPC_CONNECTION_HELPER.channel.consume(
                queueName,
                async (msg) => {
                    // console.log("msg", msg)
                    const {
                        replyTo,
                        correlationId,
                    } = msg.properties;
                    const c = JSON.parse(msg.content.toString());
                    const r = await RPC_EXPOSE_FUNCTION_HELPER[k](c);
                    /** Reply response to replyTo queue */
                    RPC_CONNECTION_HELPER.channel.sendToQueue(
                        replyTo,
                        Buffer.from(JSON.stringify(r)),
                        { correlationId, },
                    );
                    RPC_CONNECTION_HELPER.channel.ack(msg);
                }
            );
            console.log(`-> "${queueName}" has been setup for RPC consumption`);
        });
    },
    subscribeAndListenForEvents: async ({
    	API_DOMAIN_NAME,
    	EVENT_EXCHANGE_NAME,
    	IS_SUBSCRIBE_ALL = false
    }) => {
        console.log('Setting up RPC event subscription');
        // Assert Exchange Exists (if not create)
        RPC_CONNECTION_HELPER.channel.assertExchange(
            EVENT_EXCHANGE_NAME,
            'topic',
            { durable: true, }
        );
        // Asset Queue assigned to exchange (if not create)
        // 1 Unique queue per domain to be able to handle multiple workers
        const q = await RPC_CONNECTION_HELPER.channel.assertQueue(
            // ensure unique for each domain API
            `${API_DOMAIN_NAME}-event-listener-queue`.toLowerCase(),
            { exclusive: false, },
        );
        // Loop event key (routing key) to subscribe to
        // Register each key to channel and bind listener
        if (IS_SUBSCRIBE_ALL == true) {
        	RPC_CONNECTION_HELPER.channel.bindQueue(
	                q.queue,
	                EVENT_EXCHANGE_NAME,
	                "#",
	            );
	       console.log(`-> events has been setup`);
        } else {
        	const eventKeys = _.keys(RPC_EVENT_SUBSCRIBE_HELPER);
	        eventKeys.forEach((k) => {
	            RPC_CONNECTION_HELPER.channel.bindQueue(
	                q.queue,
	                EVENT_EXCHANGE_NAME,
	                k,
	            );
	            console.log(`-> "${k}" event has been setup`);
	        });
        }
        // Consume messages based on listening routing key
        RPC_CONNECTION_HELPER.channel.consume(
            q.queue,
            async (msg) => {
                const k = msg.fields.routingKey;
                const c = JSON.parse(msg.content.toString());
                if (RPC_EVENT_SUBSCRIBE_HELPER[k]) {
                    const r = await RPC_EVENT_SUBSCRIBE_HELPER[k](c);
                }
                RPC_CONNECTION_HELPER.channel.ack(msg);
            }, {
                noAck: false,
            }
        );
    },
}

module.exports = RPC_HELPER;