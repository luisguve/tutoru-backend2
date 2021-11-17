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
        <h1>Masterclass</h1>
        <p>Hello friendss</p>
      </div>
    </div>
  );
};

export default memo(HomePage);
