import React from 'react';
import { PASS_BENEFITS } from '../data/passBenefits';
import { PassBenefit } from './PassBenefit';

export function PassBenefits() {
  return (
    <div className="pass-benefits">
      {PASS_BENEFITS.map((benefit) => (
        <PassBenefit key={benefit.title} {...benefit} />
      ))}
    </div>
  );
}

export default PassBenefits;
