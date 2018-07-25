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
        this.optimalOrderTotal = this.optimalOrder.reduce((a,b,index) => a + b * this.values[index], 0);

        this.bestOffer = null;
        this.bestOfferTotal = 0;
    }
    offer(o){
        this.log(`${this.rounds} rounds left`);
        this.rounds--;
        if (!o)
        {
            this.log('optimal ');
            this.log(this.optimalOrder);
            return this.optimalOrder;
        }

        let offerTotal = o.reduce((a,b,index) => a + b * this.values[index], 0);
        this.log(`offer total`);
        this.log(offerTotal);
        if(offerTotal >= this.optimalOrderTotal) {
            this.log(`optomal total`);
            this.log(this.optimalOrderTotal);
            this.log(`more then optimal`);
            return;
        }

        if(offerTotal > this.bestOfferTotal) {
            this.bestOfferTotal = offerTotal;
            this.bestOffer = o;
            if(!this.rounds && this.bestOfferTotal >= this.total * 0.5) {
                this.log(`last chance`);
                return;
            }
        }

        let needToGet = o.map((count, index) => this.counts[index] - count);

        let needToGetOptimal = o.map((count, index) => this.optimalOrder[index] - count);

        let newOffer = o.slice();
        for(let i = 0; i < this.counts.length; i++) {
            if(needToGetOptimal[i] < 0) {
                newOffer[i] += needToGetOptimal[i];
            } else if(needToGetOptimal[i] > 0) {
                newOffer[i] += Math.floor(needToGet[i] / 2) + 1;
            }
        }


        let newOfferTotal = newOffer.reduce((a,b,index) => a + b * this.values[index]);

        if(
            this.lastOfferTotal && this.lastOfferTotal == newOfferTotal
            && offerTotal >= this.total *0.6
        ) {
            this.log(`my new order the same as previous`);
            return;
        }

        if(!this.rounds && newOfferTotal < this.bestOfferTotal && this.bestOffer) {
            this.log(`last chance`);
            return this.bestOffer;
        }
        this.lastOfferTotal = newOfferTotal;
        return newOffer;
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
            let valuesGroups = k_means(this.values, 3, this.log);
            this.log(JSON.stringify(valuesGroups));
            //this.log([valuesGroups[0].indexes,valuesGroups[1].indexes,valuesGroups[2].indexes,]);
            this.log(this.values);
            this.log(this.counts);
            this.log('-----------');
            this.log(valuesGroups[0].indexes);
            for(let id of (valuesGroups[0].indexes)) {
                this.log(id);
                o[id] = this.counts[id];
            }
            this.log('-----------');
            this.log(valuesGroups[1].indexes);
            for(let id of valuesGroups[1].indexes) {
                this.log(id);
                o[id] = Math.floor(this.counts[id] / 2) + 1;
            }
            this.log('-----------');
            this.log(o);
            this.log('-----------');
        }
        return o;
    }
};

function k_means(x, n, log) {
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
    return vals.sort((a,b) => {return b.avg - a.avg});
}
