export function parse(
  text: string,
  values: any,
  startDelimeter = "{",
  endDelimeter = "}"
) {
  return text.replace(
    new RegExp(
      `${startDelimeter.replace("{", "\\{")}(.*?)${endDelimeter.replace("}", "\\}")}`,
      "g"
    ),
    (_, path) => {
      try {
        const keys = path.split(".");
        let result: any = values;

        for (const key of keys) {
          if (result == null) return "";
          result = result[key];
        }

        if (result === undefined || result === null) return "";

        return typeof result === "object"
          ? JSON.stringify(result)
          : String(result);
      } catch {
        return "";
      }
    }
  );
}