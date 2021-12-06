/*
 *
 * HomePage
 *
 */

import React, { memo } from 'react';

const HomePage = () => {
  return (
    <div className="pt-5 px-4">
      <div className="bg-white shadow-sm d-flex flex-column py-3 px-5">
        <h1>Masterclass plugin</h1>
        <p>Work in progress</p>
        <p className="small">Contact me: luisguveal@gmail.com</p>
      </div>
    </div>
  );
};

export default memo(HomePage);
