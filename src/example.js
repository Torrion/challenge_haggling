'use strict'; /*jslint node:true*/

module.exports = class Agent {
    constructor(me, counts, values, max_rounds, log){
        this.counts = counts;
        this.values = values;
        this.rounds = max_rounds;
        this.log = log;
        this.total = 0;
        for (let i = 0; i<counts.length; i++)
            this.total += counts[i]*values[i];
        this.optimalOrder = this.calculateOptimalOrder();
        this.log('optimal ');
        this.log(this.optimalOrder);
        this.optimalOrderTotal = this.optimalOrder.reduce((a,b,index) => a + b * this.values[index], 0);

        this.bestOffer = null;
        this.bestOfferTotal = 0;
        this.previousMutation = [];
        this.lastOffer = [];
        this.maxIncome = this.values.reduce(
            (a,b, index) => {
                if(a.max < b) {
                    a.max = b; a.id = [index]
                } else if (a.max = b){
                    a.id.push(index);
                }
                return a;
            },
            {'max': 0, 'id': []}
        );
    }
    offer(o){
        this.log(`${this.rounds} rounds left`);
        this.rounds--;
        if (!o)
        {
            return this.optimalOrder;
        }

        let offerTotal = o.reduce((a,b,index) => a + b * this.values[index], 0);
        this.log(`offer total`);
        this.log(offerTotal);
        if(offerTotal >= this.optimalOrderTotal) {
            this.log(`more then optimal`);
            return;
        }

        if(offerTotal > this.bestOfferTotal) {
            this.bestOfferTotal = offerTotal;
            this.bestOffer = o;
            if(!this.rounds && this.bestOfferTotal >= this.total * 0.6) {
                this.log(`last chance`);
                return;
            }
        }

        let needToGet = o.map((count, index) => this.counts[index] - count);

        let needToGetOptimal = o.map((count, index) => this.optimalOrder[index] - count);

        let needToGetIncome = needToGet.map((count, index) => count * this.values[index]);
        let maxToGetIncome = needToGetIncome.reduce(
            (a,b, index) => {if(a.max < b) {a.max = b; a.id = index}; return a;},
            {'max': -1, 'id': null}
        );
        let totalToGet = needToGetIncome
            .reduce((a,b,index) => a + b, 0);

        let newOffer = Array.from({length: this.values.length}, (v, i) => 0);

        if(maxToGetIncome.max < totalToGet * 0.5) {
            for(let i in o) {
                if(i != maxToGetIncome.id) {
                    newOffer[i] = this.counts[i];
                } else {
                    newOffer[i] = o[i];
                }
            }
            this.log('experiment');
            return newOffer;
        }

        let offersDiff = Array.from({length: this.values.length}, (v, i) => 0);

        if(this.lastOffer) {
            offersDiff = o.map((count, index) => count - this.lastOffer[index]);
        }

        // let newOffer = o.slice();

        for(let i = 0; i < this.counts.length; i++) {
            if(needToGetOptimal[i] > 0 && offersDiff[i] >= 0) {
                let inc = Math.floor(needToGetOptimal[i] / 2);
                newOffer[i] = o[i] + (inc == 0 ? 1 : inc);
            } else if(needToGetOptimal[i] >= 0) {
                let inc = 1;
                if(needToGetOptimal[i] > 2) {
                    inc = Math.floor(needToGetOptimal[i] / 2);
                } else {
                    inc = needToGetOptimal[i];
                }
                newOffer[i] = o[i] + inc;
            } else if(needToGetOptimal[i] < 0 && offersDiff[i] >= 0) {
                if(this.values[i] > 0) {
                    newOffer[i] = o[i];
                } else {
                    newOffer[i] = 0;
                }
            } else {
                newOffer[i] = o[i] > 0 ? o[i] -1 : 0;
            }
        }

        let newOfferTotal = newOffer.reduce((a,b,index) => a + b * this.values[index]);

        //if(this.lastOffer.every((element, index) => element == newOffer[index])) {
        //    if(this.previousMutation.length == this.values) {
        //        this.previousMutation = [];
        //    }
        //
        //    let min = Math.floor((this.bestOfferTotal + this.optimalOrderTotal) / 2);
        //    console.log('min ');
        //    let mutated = false;
        //    for(let i in newOffer) {
        //        if(this.allowMutation(i) && newOffer[i] > 0) {
        //            if(newOfferTotal - this.values[i] >= min) {
        //                newOffer[i] -= 1;
        //                newOfferTotal -= this.values[i];
        //                this.previousMutation.push(i);
        //                mutated = true;
        //                console.log('mutated');
        //            } else {
        //                break;
        //            }
        //        }
        //    }
        //
        //    if(!mutated) {
        //        // for(let i in newOffer) {
        //        //     if(this.maxIncome.id.indexOf(i) < 0  && newOffer[i] > 0) {
        //        //         i f(this.allowMutation(i) && newOfferTotal - this.values[i] > 0) {
        //        //             newOffer[i] -= 1;
        //        //             newOfferTotal -= this.values[i];
        //        //         } else {
        //        //             break;
        //        //         }
        //        //     }
        //        // }
        //        this.previousMutation = [];
        //    }
        //}

        if(
            this.lastOfferTotal && this.lastOfferTotal == newOfferTotal
            && offerTotal >= this.total *0.6
            && this.rounds < 2
        ) {
            this.log(`my new order the same as previous`);
            return;
        }

        if(!this.rounds && newOfferTotal < this.bestOfferTotal && this.bestOffer != o) {
            this.log(`last chance`);
            return this.bestOffer;
        }
        this.lastOfferTotal = newOfferTotal;
        this.lastOffer = newOffer;
        return newOffer;
    }

    allowMutation(i) {
        if(this.maxIncome.id.length == 1) {
            if(this.maxIncome.id[0] == i) {
                return false;
            }
            return this.previousMutation.indexOf(i) < 0;
        }

        return this.previousMutation.indexOf(i) < 0;
    }

    calculateOptimalOrder(){
        let o = Array.from({length: this.values.length}, (v, i) => 0);
        if(this.counts.length == 1) {
            o[0] = Math.floor(this.counts[id] / 2) + 1;
        } else if(this.counts.length == 2) {
            if(this.values[0] > this.values[1]) {
                o[0] = this.counts[0];
                o[1] = 1;
            } else {
                o[1] = this.counts[1];
                o[0] = 1;
            }
        } else {
            let valuesGroups = this.k_means(this.values, 3, this.log);
            this.log(JSON.stringify(valuesGroups));
            //this.log([valuesGroups[0].indexes,valuesGroups[1].indexes,valuesGroups[2].indexes,]);
            this.log(this.values);
            this.log(this.counts);
            this.log('-----------');
            this.log(valuesGroups[0].indexes);
            for(let id of (valuesGroups[0].indexes)) {
                o[id] = this.counts[id];
            }
            this.log('-----------');
            this.log(valuesGroups[1].indexes);
            for(let id of valuesGroups[1].indexes) {
                if(this.values[id] > 0) {
                    o[id] = 1;
                    if(this.counts[id] > 2) {
                        o[id] = Math.floor(this.counts[id] / 2) + 1;
                    }
                }
            }
            this.log('-----------');
            for(let id of valuesGroups[2].indexes) {
                if(this.values[id] > 0){
                    o[id] = 1;
                }

            }
        }
        return o;
    }

    k_means(x, n, log) {
        let vals = [];

        for(let i = 0; i < x.length; i++) {
            vals.push({
                'indexes': [i],
                'values': [x[i]],
                'avg': x[i]
            });
        }

        let count = vals.length;

        while(count > n) {
            let distances = [];
            for(let i = 0; i< vals.length; i++) {
                for(let j = 0; j< i; j++) {
                    if(!vals[i] || !vals[j]) {
                        continue;
                    }
                    distances.push({
                        'dist': Math.abs(vals[i].avg - vals[j].avg),
                        'i': i,
                        'j': j
                    });
                }
            }

            let min = distances
                .reduce(
                    (a,b, index) => {if(a.min > b.dist) {a.min = b.dist; a.id = index}; return a;},
                    {'min': Number.MAX_SAFE_INTEGER, 'id': null}
                );

            let dist = distances[min.id];

            vals[dist.i].indexes = vals[dist.i].indexes.concat(vals[dist.j].indexes);
            vals[dist.i].values =vals[dist.i].values.concat(vals[dist.j].values);
            vals[dist.i].avg = vals[dist.i].values.reduce((a,b) => a+b) / vals[dist.i].values.length;
            delete vals[dist.j];
            count--;
        }
        vals = vals.filter((a) => a);
        //log(JSON.stringify(vals));
        return vals
            .sort(
                (a,b) => {
                    let diff = b.avg - a.avg;
                    if(diff == 0) {
                        let incomeA = a.indexes.reduce(
                            (a, b) => a + this.values[b] * this.counts[b]
                        );

                        let incomeB = b.indexes.reduce(
                            (a, b) => a + this.values[b] * this.counts[b]
                        );

                        return incomeB - incomeA;
                    }
                    return diff;
                });
    }

};

