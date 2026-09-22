def group_list(list, size=4): #defult size 4
    grouped_list = []
    for i in range(0, len(list), size): # az 0 ta len 4ta 4ta mire jolo
        grouped_list.append(list[i: i + size]) # i ta i+size
    return grouped_list #listi az list haye 4 tayi


