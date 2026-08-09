import install from "../../source_code/modules/m3_control/index.ts";
import { scopedExtensionApi } from "../rsibench-runtime/module-api.ts";

export default function load(pi) {
  return install(scopedExtensionApi(pi, "M3_control"));
}
