
export async function read_csv_file(file_name) {
    let data = fetch(file_name)
        .then((response) => response.text())
        .then((csv) => {
            // Convert from string to js object where each row is an object
            let rows = csv.split('\n');
            let header = rows[0].split(',');
            let data = [];
            for (let i = 1; i < rows.length; i++) {
                let row = rows[i].split(',');
                let obj = {};
                for (let j = 0; j < header.length; j++) {
                    obj[header[j]] = row[j];
                }
                data.push(obj);
            }
            // console.log(data);
            return data;
        });

    return await data;
}