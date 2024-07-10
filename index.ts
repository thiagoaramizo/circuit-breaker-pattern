enum CircuitBreakerState {
    CLOSED,
    OPEN,
    HALF_OPEN
}

class CircuitBreaker {
    private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
    private failureCount: number = 0;
    private successThreshold: number;
    private failureThreshold: number;
    private timeout: number;
    private nextAttempt: number = Date.now();

    constructor(failureThreshold: number, successThreshold: number, timeout: number) {
        this.failureThreshold = failureThreshold;
        this.successThreshold = successThreshold;
        this.timeout = timeout;
    }

    private setState(state: CircuitBreakerState) {
        this.state = state;
        if (state === CircuitBreakerState.OPEN) {
            this.nextAttempt = Date.now() + this.timeout;
        }
    }

    private canAttempt() {
        if (this.state === CircuitBreakerState.OPEN && Date.now() > this.nextAttempt) {
            this.setState(CircuitBreakerState.HALF_OPEN);
            return true;
        }
        return this.state === CircuitBreakerState.CLOSED || this.state === CircuitBreakerState.HALF_OPEN;
    }

    async execute<T>(action: () => Promise<T>): Promise<T> {
        if (!this.canAttempt()) {
            throw new Error("Circuit breaker is open");
        }

        try {
            const result = await action();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private onSuccess() {
        this.failureCount = 0;
        if (this.state === CircuitBreakerState.HALF_OPEN) {
            this.setState(CircuitBreakerState.CLOSED);
        }
    }

    private onFailure() {
        this.failureCount += 1;
        if (this.failureCount >= this.failureThreshold) {
            this.setState(CircuitBreakerState.OPEN);
        }
    }
}

// Exemplo de uso:
const breaker = new CircuitBreaker(3, 2, 10000); // 3 falhas para abrir, 2 sucessos para fechar, timeout de 10 segundos

async function exampleRequest() {
    console.log('I am requested!')
    // Simulando uma requisição que pode falhar
    const random = Math.random();
    if (random < 0.7) {
        throw new Error("Request failed");
    }
    return "Success";
}

async function run() {
    try {
        const result = await breaker.execute(exampleRequest);
        console.log(new Date().toISOString(), result);
    } catch (error) {
        console.log(new Date().toISOString(), error.message);
    }
}

// Tentando executar múltiplas requisições para ver o Circuit Breaker em ação
setInterval(run, 1000);
