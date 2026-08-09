import install from "../../source_code/modules/m2_state/index.ts";
import { scopedExtensionApi } from "../rsibench-runtime/module-api.ts";

export default function load(pi) {
  return install(scopedExtensionApi(pi, "M2_state"));
}
