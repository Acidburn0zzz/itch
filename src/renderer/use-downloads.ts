import { Download } from "common/butlerd/messages";
import { DownloadsState } from "common/downloads";
import { filterObject } from "common/filter-object";
import { packets } from "common/packets";
import { queries } from "common/queries";
import _ from "lodash";
import { useState, useCallback } from "react";
import { useSocket } from "renderer/contexts";
import { useListen } from "renderer/Socket";
import { useAsync } from "renderer/use-async";

export interface DownloadFilter {
  gameId?: number;
}

function applyFilter(dl: Download, filter?: DownloadFilter): boolean {
  if (filter?.gameId) {
    return dl.game?.id == filter?.gameId;
  } else {
    return true;
  }
}

export function useDownloads(filter?: DownloadFilter): DownloadsState {
  const filterState = JSON.stringify(filter);

  const [downloads, setDownloads] = useState<DownloadsState>({});
  const mergeDownloads = useCallback(
    (fresh: DownloadsState) => {
      setDownloads(old => ({
        ...old,
        ...filterObject(fresh, dl => applyFilter(dl, filter)),
      }));
    },
    [filterState]
  );

  const socket = useSocket();
  useAsync(async () => {
    const { downloads } = await socket.query(queries.getDownloads);
    mergeDownloads(downloads);
  }, [filterState]);

  let downloadChanged = ({ download }: { download: Download }) => {
    mergeDownloads({ [download.id]: download });
  };
  useListen(socket, packets.downloadStarted, downloadChanged, [filterState]);
  useListen(socket, packets.downloadChanged, downloadChanged, [filterState]);
  useListen(
    socket,
    packets.downloadCleared,
    ({ download }) => {
      setDownloads(old => _.omit(old, download.id));
    },
    [filterState]
  );

  return downloads;
}