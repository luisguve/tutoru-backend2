import React, { useEffect, useState, useReducer, useRef } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { FormattedMessage, useIntl } from 'react-intl';
import { request } from "strapi-helper-plugin"
import Duration from '../Duration';
import LoadingIndicator from '../LoadingIndicator';
import PlayIcon from '../PlayIcon';
import Wrapper from './Wrapper';
import CanvasWrapper from './CanvasWrapper';
import Thumbnail from './Thumbnail';
import reducer, { initialState } from './reducer';
import { getRequestUrl } from '../../utils';
import getTrad from '../../utils/getTrad';

const EmptyPreview = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.main.sizes.fonts.xs};
  color: ${({ theme }) => theme.main.colors.grey};
`;

const VideoPreview = ({ hasIcon, previewUrl, videoId }) => {
  const { formatMessage } = useIntl();
  const [reducerState, dispatch] = useReducer(reducer, initialState);
  const {
    duration,
    dataLoaded,
    isHover,
    metadataLoaded,
    snapshot,
    seeked,
    isError,
  } = reducerState.toJS();
  const [src, setSrc] = useState(null)

  const getPlayInfo = async () => {
    const requestURL = getRequestUrl(`get-play-info/${videoId}`)
    try {
      const playURL = await request(requestURL, { method: 'GET' });
      console.log({playURL})
      setSrc(playURL)
    } catch(err) {
      console.log(err)
    }
  }
  useEffect(() => {
    getPlayInfo()
  }, [])
/*
  const fetchVideo = async () => {
    const vodClient = new Core({
      accessKeyId: CUSTOM_VARIABLES.OSS_ACCESS_KEY_ID,
      accessKeySecret: CUSTOM_VARIABLES.OSS_ACCESS_KEY_SECRET,
      endpoint: `https://vod.${CUSTOM_VARIABLES.VOD_REGION}.aliyuncs.com`,
      apiVersion: '2017-03-21',
      timeout: +(config.ossTimeout * 1000)
    });
    var params = {
      "RegionId": CUSTOM_VARIABLES.VOD_REGION,
      "VideoId": rest.videoId
    }
    var requestOption = {
      method: 'POST'
    };
    try {
      const result = await vodClient.request('GetPlayInfo', params, requestOption)
      console.log(result.PlayInfoList.PlayInfo.PlayURL)
      setSrc(result.PlayInfoList.PlayInfo.PlayURL)
    } catch(err) {
      console.log(err)
    }
    return

    // urlParts:
    // ["https://{bucket}", "{region}". "aliyuncs", "com/{filename}", "{file extension}"]
    const bucket = urlParts[0].replace(/https?:\/\//, "")
    const region = urlParts[1]
    const filename = urlParts[3].replace("com/", "").concat(".").concat(urlParts[4])

    const store = new OSS({
      accessKeyId: CUSTOM_VARIABLES.OSS_ACCESS_KEY_ID,
      accessKeySecret: CUSTOM_VARIABLES.OSS_ACCESS_KEY_SECRET,
      region,
      bucket,
    })
    store.get(filename)
    .then(res => console.log(Buffer.isBuffer(res.content)))
    .catch(err => console.log(filename, err))
  }

  // privateSrc has the following format:
  // "https://{bucket}.{region}.aliyuncs.com/{filename}.{file extension}"
  const urlParts = privateSrc.split(".")

  if (urlParts && urlParts.length === 5) {
    fetchVideo()
  }
*/
  // Adapted from https://github.com/brothatru/react-video-thumbnail/blob/master/src/components/VideoThumbnail.js
  // And from https://github.com/soupette/poc-video-preview
  const canvasRef = useRef();
  const videoRef = useRef();

  useEffect(() => {
    const getSnapshot = () => {
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        canvas.getContext('2d').drawImage(video, 0, 0);

        const thumbnail = canvas.toDataURL('image/png');

        video.src = ''; // setting to empty string stops video from loading

        dispatch({
          type: 'SET_SNAPSHOT',
          snapshot: thumbnail,
        });
      } catch (e) {
        console.error(e);
      }
    };

    if (dataLoaded && metadataLoaded && videoRef.current) {
      videoRef.current.currentTime = 0;

      if (seeked && !snapshot) {
        getSnapshot();
      }
    }
  }, [dataLoaded, metadataLoaded, seeked, snapshot]);

  if (isError) {
    return (
      <EmptyPreview>
        <FormattedMessage id={getTrad('list.assets.not-supported-content')} />
      </EmptyPreview>
    );
  }

  return (
    <Wrapper
      // Specify isHover to prevent bad behavior when compo is under the cursor on modal open
      onMouseEnter={() => {
        dispatch({
          type: 'SET_IS_HOVER',
          isHover: true,
        });
      }}
      onMouseLeave={() => {
        dispatch({
          type: 'SET_IS_HOVER',
          isHover: false,
        });
      }}
    >
      {!snapshot && (
        <LoadingIndicator
          aria-label={formatMessage(
            {
              id: getTrad('list.assets.loading-asset'),
            },
            { path: src }
          )}
        />
      )}

      <CanvasWrapper>
        {previewUrl ? (
          <Thumbnail
            src={previewUrl}
            alt={formatMessage(
              {
                id: getTrad('list.assets.preview-asset'),
              },
              { path: src }
            )}
          />
        ) : (
          <>
            <video
              muted
              ref={videoRef}
              src={src}
              onError={() => dispatch({ type: 'SET_ERROR', isError: true })}
              onLoadedMetadata={() => {
                dispatch({
                  type: 'METADATA_LOADED',
                });
              }}
              onLoadedData={({ target: { duration } }) => {
                dispatch({
                  type: 'DATA_LOADED',
                  duration,
                });
              }}
              onSeeked={() => {
                dispatch({
                  type: 'SEEKED',
                });
              }}
            />
            <canvas ref={canvasRef} />
          </>
        )}
        <Duration duration={duration} />

        {(hasIcon || isHover) && <PlayIcon small />}
      </CanvasWrapper>
    </Wrapper>
  );
};

VideoPreview.defaultProps = {
  hasIcon: false,
  previewUrl: null,
  src: null,
};

VideoPreview.propTypes = {
  hasIcon: PropTypes.bool,
  previewUrl: PropTypes.string,
  src: PropTypes.string,
};

export default VideoPreview;
