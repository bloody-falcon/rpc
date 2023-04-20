## Installing

```
npm add git+https://github.com/bloody-falcon/rpc.git
```

Once the package , is installed, you can import library use require approach
```
const RPC = require("rpc");
```
## Usage

At first, We need to set some configs.
```
RPC.setRPCTimeout(5 * 1000)
RPC.setRPCEventExchangeName("test")
RPC.setRPCDomainName('account');
```
Connect to Rabbit MQ
```
await RPC.connect({
	RABBIT_MQ_URL,
    RABBIT_MQ_PORT,
    RABBIT_MQ_USERNAME,
    RABBIT_MQ_PWD,
    RABBIT_MQ_VHOST
});
```
emitEvent:
```
await RPC.emitEvent("client-new, { id: "xxx", name: "yyyy" });
```
listen Event: If the eventKey as "#", then, it's listen all event of system
```
RPC.on(key, ‘event’, async function)
```
listen RPC call:
```
RPC.on(key, ‘rpc’, async function);
```
callRPC
```
RPC.callRPC(key, input);
```