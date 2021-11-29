import React, { useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { request } from "strapi-helper-plugin"

import PlayIcon from '../PlayIcon';
import Duration from '../Duration';
import { getRequestUrl } from '../../utils';
import Wrapper from './Wrapper';

const VideoPlayer = ({ id }) => {
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [src, setSrc] = useState(null)

  const videoRef = useRef();

  const togglePlay = () => {
    if (isPlaying) {
      videoRef.current.pause();
      // Change isPlaying here too because onPause handler is only called on controls click
      setIsPlaying(false);
    } else {
      videoRef.current.play();
    }
  };

  const getPlayInfo = async () => {
    const requestURL = getRequestUrl(`get-play-info/${id}`)
    try {
      const res = await request(requestURL, { method: 'GET' });
      setSrc(res.PlayURL)
    } catch(err) {
      console.log(err)
    }
  }
  useEffect(() => {
    getPlayInfo()
  }, [])

  return (
    <Wrapper onClick={togglePlay}>
      <video
        controls={isPlaying}
        ref={videoRef}
        src={src}
        crossOrigin="anonymous"
        onLoadedData={({ target: { duration } }) => {
          setDuration(duration);
        }}
        onPlay={() => {
          setIsPlaying(true);
        }}
        onPause={() => {
          setIsPlaying(false);
        }}
      >
        <track default kind="captions" srcLang="en" src="" />
      </video>
      {!isPlaying && <PlayIcon />}
      <Duration duration={duration} />
    </Wrapper>
  );
};

VideoPlayer.defaultProps = {
  id: 1,
};

VideoPlayer.propTypes = {
  id: PropTypes.number,
};

export default VideoPlayer;
