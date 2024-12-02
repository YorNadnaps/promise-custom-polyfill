const STATES = {
    PENDING: 'Pending',
    FULFILLED: 'Fulfilled',
    REJECTED: 'Rejected'
};

/**
 * Promise polyfill
 */
class PromisePolyfill {
    constructor(executorFn) {
        /** Promise state. */
        this.state = STATES.PENDING;
        this.value = undefined;
        this.reason = undefined;
        this.thenQueue = [];
        this.finallyQueue = [];

        /** Bind resolution and rejection handlers to the `this` keyword. */
        this._onResolve = this._onResolve.bind(this);
        this._onReject = this._onReject.bind(this);

        if (typeof executorFn === 'function') {
            try {
                executorFn(this._onResolve, this._onReject);
            } catch (ex) {
                this._onReject(ex);
            }
        }
    }

    then(thenCb, catchCb) {
        const controlledPromise = new PromisePolyfill();
        this.thenQueue.push({
            controlledPromise,
            thenCb,
            catchCb
        });
        if (this.state === STATES.FULFILLED) {
            this.runThenHandlers();
        } else if (this.state === STATES.REJECTED) {
            this.runCatchHandlers();
        }
        return controlledPromise;
    }

    catch(catchCb) {
        return this.then(undefined, catchCb);

    }

    finally(finallyCb) {
        /** If state is already fulfilled or rejected, we run finallyCb and return a promise. */
        if (this.state !== STATES.PENDING) {
            finallyCb();

            return this.state === STATES.FULFILLED ?
                PromisePolyfill.resolve(this.value) :
                PromisePolyfill.reject(this.reason);
        }

        const controlledPromise = new PromisePolyfill();
        this.finallyQueue.push({
            controlledPromise,
            finallyCb
        });
        return controlledPromise;
    }

    _onResolve(value) {
        /** To ensure then callback is run only once. */
        if (this.state === STATES.PENDING) {
            this.state = STATES.FULFILLED;
            this.value = value;
            this.runThenHandlers();
        }
    }

    _onReject(reason) {
        /** To ensure then callback is run only once. */
        if (this.state === STATES.PENDING) {
            this.state = STATES.REJECTED;
            this.reason = reason;
            this.runCatchHandlers();
        }
    }

    runThenHandlers() {
        this.thenQueue.forEach(({ controlledPromise, thenCb }) => {
            if (typeof thenCb === 'function') {
                const returnValue = thenCb(this.value);
                if (returnValue && typeof returnValue.then === 'function') {
                    returnValue
                        .then(val => {
                            controlledPromise._onResolve(val);
                        })
                        .catch(ex => {
                            controlledPromise._onReject(ex);
                        })
                } else {
                    controlledPromise._onResolve(returnValue);
                }
            } else {
                controlledPromise._onResolve(this.value);
            }
        });

        this.finallyQueue.forEach(({ controlledPromise, finallyCb }) => {
            finallyCb();
            controlledPromise._onResolve(this.value);
        });

        this.thenQueue = [];
        this.finalluQueue = [];
    }

    runCatchHandlers() {
        this.thenQueue.forEach(({ controlledPromise, catchCb }) => {
            if (typeof catchCb === 'function') {
                const returnValue = catchCb(this.reason);
                if (returnValue && typeof returnValue.then === 'function') {
                    returnValue
                        .then(val => controlledPromise._onResolve(val))
                        .catch(ex => controlledPromise._onReject(ex));
                } else {
                    controlledPromise._onResolve(returnValue);
                }
            } else {
                controlledPromise._onReject(this.reason);
            }
        });

        this.finallyQueue.forEach(({ controlledPromise, finallyCb }) => {
            finallyCb();
            controlledPromise._onReject(this.value);
        });

        this.thenQueue = [];
        this.finallyQueue = [];
    }
}

PromisePolyfill.resolve = function (value) {
    const controlledPromise = new PromisePolyfill();
    controlledPromise._onResolve(value);
    return controlledPromise;
}

PromisePolyfill.reject = function (reason) {
    const controlledPromise = new PromisePolyfill();
    controlledPromise._onReject(reason);
    return controlledPromise;
}

console.log("1. Executor should run");
const p1 = new PromisePolyfill(() => {
    console.log('Hello promise');
});
console.log("-----------------------");

console.log("2. Promise should resolve");
const p2 = new PromisePolyfill((res) => {
    res('promise resolved');
});

p2.then(console.log);
console.log("-----------------------");

console.log("3. Promise should run if resolved asynchronously.");
const p3 = new PromisePolyfill((res) => {
    setTimeout(() => {
        res('promise resolved 3');
    });
});

p3.then(console.log);
console.log("-----------------------");

console.log("4. Promise should run if resolved synchronously.");
const p4 = new PromisePolyfill((res) => {
    res('promise resolved 4');
});

p4.then(console.log);
console.log("-----------------------");

console.log("5. Promise can be chained.");
const p5 = new PromisePolyfill((res) => {
    res('promise chaining 1');
});

p5.then(val => {
    console.log(val);
    return val + ' it1';
}).then(val => {
    console.log(val);
});
console.log("-----------------------");

console.log("6. Promise can be rejected.");
const p6 = new PromisePolyfill((res, rej) => {
    rej('promise rejected 6');
});

p6
    .then(console.log)
    .catch(console.log);
console.log("-----------------------");

console.log("7. Should catch exception in executor function.");
const p7 = new PromisePolyfill((_res, _rej) => {
    throw ('Some error');
});

p7
    .then(console.log)
    .catch(console.log);
console.log("-----------------------");

console.log("8. Promise's then method can return a promise.");
const p8 = new PromisePolyfill((res) => {
    res('promise resolved 8');
});

p8
    .then(val => {
        return new PromisePolyfill(res => {
            res(val);
        });
    }).then(val => {
        console.log(val);
    });
console.log("-----------------------");

console.log("9. Promise's catch method can return a promise.");
const p9 = new PromisePolyfill((_res, rej) => {
    rej('promise rejected 9');
});

p9
    .then(val => {
        return new PromisePolyfill(res => {
            res(val);
        });
    }).catch(ex => {
        console.log(ex);
        return new Promise((res) => {
            res('Error caught successfully');
        });
    }).then(val => {
        console.log(val);
    });
console.log("-----------------------");

console.log("10. Promise's prototype resolve method should work.");
const p10 = PromisePolyfill.resolve(12);

p10
    .then(val => {
        console.log("p10 val: ", val);
    });
console.log("-----------------------");

console.log("11. Promise's prototype reject method should work.");
const p11 = PromisePolyfill.reject('Some rejection error');

p11
    .then(val => {
        console.log("p10 val: ", val);
    })
    .catch(ex => {
        console.log(ex);
    });
console.log("-----------------------");

console.log("12. Promise's finally should work.");
const p12 = PromisePolyfill.resolve('Resolved for finally');

p12
    .then(val => {
        console.log(val);
    })
    .catch(ex => {
        console.log(ex);
    })
    .finally(() => {
        console.log('The work is complete');
    });
console.log("-----------------------");