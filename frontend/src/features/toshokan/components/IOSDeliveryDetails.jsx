import React from 'react';
import { Smartphone, Download, Lock } from 'lucide-react';

const PROOF_POINTS = [
  { icon: Smartphone, text: 'The full reading experience on iOS.' },
  { icon: Download, text: 'A personal download link, sent to you.' },
  { icon: Lock, text: 'Available only to Pass members.' },
];

export function IOSDeliveryDetails() {
  return (
    <div className="ios-proof">
      {PROOF_POINTS.map(({ icon: Icon, text }) => (
        <div className="ios-proof__item" key={text}>
          <Icon />
          <span>{text}</span>
        </div>
      ))}
    </div>
  );
}

export default IOSDeliveryDetails;
