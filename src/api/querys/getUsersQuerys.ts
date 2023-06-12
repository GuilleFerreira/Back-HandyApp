import { getDB } from "../services/sqlDatabase";

const database = getDB();

async function generateModel(rows: any, actualUserId: number) {
    const users: any = [];
    for (const user of rows) {
        const friendsAmount = await getUserFriendsAmount(actualUserId);
        console.log(user);
        let userModel: any = {
            id: user[0],
            name: user[1],
            username: user[3],
            lastname: user[4],
            singupDate: user[8],
            email: user[7],
            description: user[9],
            profileImage: "falta",
            isFriend: actualUserId != user[0] ? user[10] : null,
            skills: user[11][0].id != null ? user[11] : [],
            friendsAmount: friendsAmount!.toString() 
        };
        
        if (userModel.id == actualUserId) {
            userModel.cedula = user[2];
        }
        users.push(userModel);
      }
    return users;
}

function query(onlyOne, actualUser, userRequested?) {
    const queryStatement = `SELECT U.id,
                            U.name,
                            U.cedula,
                            U.username,
                            U.lastname,
                            U.birthday,
                            U.referrer_id,
                            U.email,
                            U.admission_date,
                            U.description,
                            CASE
                                WHEN F.accepted IS NOT NULL THEN TRUE
                                ELSE FALSE
                            END AS is_friend,
                            ARRAY_AGG(json_build_object('id', L.id, 'name',L.name)) AS skills
                            FROM users AS U
                            LEFT JOIN friends AS F 
                            ON (U.id = F.user1_id OR U.id = F.user2_id) 
                            AND (${actualUser} = F.user1_id OR ${actualUser} = F.user2_id) 
                            AND F.accepted = TRUE
                            AND '${actualUser}' <> '${userRequested}'
                            LEFT JOIN user_skills AS S ON U.id = S.user_id
                            LEFT JOIN skills AS L ON S.skill_id = L.id
                            ${onlyOne ? `WHERE U.id = ${userRequested}` : `WHERE U.id = U.id`}
                             GROUP BY U.id, F.accepted;`
    return queryStatement;
}

export async function selectUserById(userRequested, actualUser) {;
    const queryStatement = query(true, actualUser, userRequested);

    const result = await database.query(queryStatement);
    return await generateModel(result.rows, actualUser);
}

export async function getAllUsers(actualUser) {;
    const queryStatement = query(false, actualUser);

    const result = await database.query(queryStatement);
    console.log(result);
    return await generateModel(result.rows, actualUser);
}

export async function getUserFriendsAmount(userId) {;
    const queryStatement = `SELECT COUNT(F.accepted) AS count 
                            FROM friends AS F
                            WHERE (F.user1_id = ${userId} OR F.user2_id = ${userId}) AND F.accepted = TRUE;`;

    const result = await database.query(queryStatement);
    return result.rows[0][0];
}