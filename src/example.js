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
            let initialOffer = Array.from({length: this.values.length}, (v, i) => 0);

            for (let i in initialOffer) {
                if(this.values[i]){
                    initialOffer[i] = this.counts[i];
                }
            }
            this.lastOfferTotal = this.total;
            this.lastOffer = initialOffer;
            return initialOffer;
        }

        let offerTotal = o.reduce((a,b,index) => a + b * this.values[index], 0);
        this.log(`offer total`);
        this.log(offerTotal);

        if(
            offerTotal >= this.optimalOrderTotal
            && this.optimalOrderTotal > this.total * 0.7
        ) {
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
        this.log('-----');
        this.log('to optimal');
        this.log(needToGetOptimal);
        this.log('-----');

        let needToGetIncome = needToGetOptimal.map((count, index) => count * this.values[index]);
        this.log('-----');
        this.log('to optimal income');
        this.log(needToGetIncome);
        this.log('-----');

        let possibleToGetIncome = needToGet.map((count, index) => count * this.values[index]);
        let possibleToGetTotal = this.total - offerTotal;

        let totalToGet = needToGetIncome
            .reduce((a,b,index) => a + b, 0);

        let getPriority = needToGetIncome
            .map((income, index) => {return {"income": income, "id": index}})
            .sort(
                (a, b) => {
                    let diff = a.income - b.income;
                    if(diff == 0) {
                        return this.counts[a.id] - this.counts[b.id];
                    }
                    return diff;
                }
            );

        let offersDiff = Array.from({length: this.values.length}, (v, i) => 0);

        if(this.lastOffer) {
            offersDiff = o.map((count, index) => count - this.lastOffer[index]);
        }

        let newOffer = o.slice();

        let maxItem = getPriority[getPriority.length - 1];
        let minItem = getPriority[0];

        if(maxItem.income <= possibleToGetTotal * 0.5) {
            let tmpIncome = 0;
            let tmpUpdate = Array.from({length: this.values.length}, (v, i) => 0);
            let updated = false;
            for (let i = getPriority.length - 2; i >= 0; i--) {
                let id = getPriority[i].id;
                if(!this.values[id]){
                    newOffer[id] = 0;
                    continue;
                }
                tmpIncome += needToGet[id] * this.values[id];
                tmpUpdate[id] = needToGet[id];
                if(needToGet[id]) {
                    updated = true;
                }
            }

            for(let i in newOffer) {
                newOffer[i] += tmpUpdate[i];
            }

            if(!updated) {
                let inc = needToGetOptimal[maxItem.id];
                if (
                    maxItem.income < this.optimalOrderTotal * 0.5
                    && needToGet[maxItem.id] > 2
                ) {
                    inc = 1;
                }
                newOffer[maxItem.id] += inc;
            }

            if(tmpIncome >= this.optimalOrderTotal) {


                this.lastOfferTotal = offerTotal + tmpIncome;
                this.lastOffer = newOffer;
                this.log('----');
                this.log('all except max');
                this.log(newOffer);
                this.log('----');
                return newOffer;
            }


        } else if(
            this.total - offerTotal == maxItem.income
            && offerTotal > this.total * 0.5
        ) {
            let inc = 1;
            if (
                needToGet[maxItem.id] > 2
            ) {
                inc = Math.floor(needToGet[maxItem.id]/ 2);
            }
            newOffer[maxItem.id] += inc;
            for (let i in newOffer) {
                if (!this.values[i]) {
                    newOffer[i] = 0;
                }
            }
            this.log('----');
            this.log('single item');
            this.log(newOffer);
            this.log('----');
            return newOffer;
        } else if(maxItem.income + offerTotal >= this.optimalOrderTotal) {
            let inc = needToGetOptimal[maxItem.id];
            if (
                maxItem.income < this.optimalOrderTotal * 0.5
                && needToGet[maxItem.id] > 2
            ) {
                inc = 1;
            }
            newOffer[maxItem.id] += inc;
            for (let i in newOffer) {
                if (!this.values[i]) {
                    newOffer[i] = 0;
                }
            }
        } else if(Math.floor(totalToGet * 0.5) == maxItem.income ) {
            for (let i = getPriority.length - 2; i >= 0; i--) {
                let id = getPriority[i].id;
                if(!this.values[id]){
                    newOffer[i] = 0;
                    continue;
                }
                if(tmpIncome < this.optimalOrderTotal && this.values[i] > 0) {
                    tmpIncome += needToGetOptimal[id] * this.values[id];
                    tmpUpdate[id] = needToGetOptimal[id];
                }
            }

            for(let i in newOffer) {
                newOffer[i] += tmpUpdate[i];
            }
        } else {
            newOffer[maxItem.id] += needToGetOptimal[maxItem.id];
            let tmpIncome = needToGetIncome[maxItem.id];
            let tmpUpdate = Array.from({length: this.values.length}, (v, i) => 0);
            for (let i = getPriority.length - 2; i >= 0; i--) {
                let id = getPriority[i].id;
                if(!this.values[id]){
                    newOffer[id] = 0;
                    continue;
                }
                if(tmpIncome < this.optimalOrderTotal && this.values[i] > 0) {
                    let count = needToGetOptimal[id];
                    if(count > 1) {
                        count = 1
                    }
                    tmpIncome += count * this.values[id];
                    tmpUpdate[id] = count;
                }
            }

            for(let i in newOffer) {
                newOffer[i] += tmpUpdate[i];
            }
        }

        let newOfferTotal = newOffer.reduce(
            (a, b, index) => a + b * this.values[index]
        );

        //let newOffer = Array.from({length: this.values.length}, (v, i) => 0);

        //if(maxToGetIncome.max < totalToGet * 0.5) {
        //     for(let i in o) {
        //         if(i != maxToGetIncome.id) {
        //             newOffer[i] = this.counts[i];
        //         } else {
        //             newOffer[i] = o[i];
        //         }
        //     }
        //     this.log('experiment');
        //     return newOffer;
        // }



        if(
            this.lastOfferTotal && this.lastOfferTotal == newOfferTotal
            && offerTotal >= this.total *0.6
            && this.rounds < 2
        ) {
            this.log(`my new order the same as previous`);
            return;
        }

        if(
            !this.rounds
            && newOfferTotal > this.bestOfferTotal
            && this.bestOfferTotal > this.total * 0.5
        ) {
            this.log(`last chance`);
            return this.bestOffer;
        }
        this.lastOfferTotal = newOfferTotal;
        this.lastOffer = newOffer;
        this.log('---');
        this.log('offer');
        this.log(newOffer);
        this.log('---');
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
                // if(this.values[id] > 0){
                //     o[id] = 1;
                // }
                o[id] = 0;
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
                            (a1, b1) => a1 + this.values[b1] * this.counts[b1]
                        );

                        let incomeB = b.indexes.reduce(
                            (a2, b2) => a2 + this.values[b2] * this.counts[b2]
                        );

                        return incomeA - incomeB;
                    }
                    return diff;
                });
    }

};

