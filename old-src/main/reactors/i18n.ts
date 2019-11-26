import { Watcher } from "common/util/watcher";
import { createSelector } from "reselect";

import { RootState } from "common/types";
import { actions } from "common/actions";

const fallbackLang = "en";

export default function(watcher: Watcher) {
  watcher.onStateChange({
    makeSelector: (store, schedule) =>
      createSelector(
        (rs: RootState) => rs.system.sniffedLanguage,
        (rs: RootState) => rs.preferences.lang,
        (sniffedLang, preferenceLang) => {
          const lang = preferenceLang || sniffedLang || fallbackLang;
          schedule.dispatch(actions.languageChanged({ lang }));
        }
      ),
  });
}
