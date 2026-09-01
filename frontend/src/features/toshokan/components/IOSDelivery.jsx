import React from 'react';
import { ReaderPhonePreview } from './ReaderPhonePreview';
import { IOSDeliveryCopy } from './IOSDeliveryCopy';
import { IOSDeliveryDetails } from './IOSDeliveryDetails';

export function IOSDelivery() {
  return (
    <section className="ios-delivery">
      <ReaderPhonePreview />
      <IOSDeliveryCopy />
      <IOSDeliveryDetails />
    </section>
  );
}

export default IOSDelivery;
