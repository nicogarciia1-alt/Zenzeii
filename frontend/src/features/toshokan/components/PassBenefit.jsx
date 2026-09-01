import React from 'react';

export function PassBenefit({ icon: Icon, glyph, title, body }) {
  return (
    <div className="pass-benefit">
      <div className="pass-benefit__icon">
        {Icon ? <Icon className="h-4 w-4" /> : <span className="pass-benefit__glyph">{glyph}</span>}
      </div>
      <div>
        <p className="pass-benefit__title">{title}</p>
        <p className="pass-benefit__body">{body}</p>
      </div>
    </div>
  );
}

export default PassBenefit;
