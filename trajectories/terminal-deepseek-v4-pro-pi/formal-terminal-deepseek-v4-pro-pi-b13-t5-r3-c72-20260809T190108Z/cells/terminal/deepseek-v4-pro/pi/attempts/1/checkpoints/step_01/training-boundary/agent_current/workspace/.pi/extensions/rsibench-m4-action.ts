import install from "../../source_code/modules/m4_action/index.ts";
import { scopedExtensionApi } from "../rsibench-runtime/module-api.ts";

export default function load(pi) {
  return install(scopedExtensionApi(pi, "M4_action"));
}
